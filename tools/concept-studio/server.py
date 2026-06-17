#!/usr/bin/env python3
"""Concept Studio — a local image-generation studio backed by Replicate.

Edit a prompt, pick a model, generate, and browse results. Drives the same kinds
of images as the project's two skills (line-art storyboards + photoreal scene shots)
plus freeform concept art.

Standard library only — no `pip install`. It calls the Replicate HTTP API directly,
so it runs anywhere with Python 3 + network + a REPLICATE_API_TOKEN.

Run:
    export REPLICATE_API_TOKEN=...     # or put it in a .env (auto-loaded)
    python3 server.py                  # auto-picks a free port and opens the browser

The Replicate API key is read server-side and is NEVER sent to the browser.
"""
import json
import os
import threading
import time
import uuid
import mimetypes
import webbrowser
import urllib.request
import urllib.error
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs

APP_DIR = Path(__file__).resolve().parent
OUT_DIR = APP_DIR / "outputs"
OUT_DIR.mkdir(exist_ok=True)
API = "https://api.replicate.com/v1"

PRESET_MODELS = ["google/nano-banana-pro", "openai/gpt-image-2"]
_schema_cache = {}


# ---------- env ----------
def load_dotenv():
    for base in (APP_DIR, APP_DIR.parent, APP_DIR.parent.parent):
        env = base / ".env"
        if env.is_file():
            for raw in env.read_text().splitlines():
                line = raw.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def token():
    return os.environ.get("REPLICATE_API_TOKEN")


def ensure_ca():
    """Best-effort: if no CA bundle is configured but certifi is installed, use it.
    Avoids the common macOS 'CERTIFICATE_VERIFY_FAILED' without disabling verification."""
    if not os.environ.get("SSL_CERT_FILE"):
        try:
            import certifi
            os.environ["SSL_CERT_FILE"] = certifi.where()
        except ImportError:
            pass


# ---------- Replicate HTTP (stdlib) ----------
def _request(url, method="GET", body=None, extra_headers=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", f"Token {token()}")
    req.add_header("Content-Type", "application/json")
    req.add_header("User-Agent", "concept-studio/1.0 (+replicate)")
    for k, v in (extra_headers or {}).items():
        req.add_header(k, v)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")
        raise RuntimeError(f"Replicate API error {e.code}: {detail}")
    except urllib.error.URLError as e:
        raise RuntimeError(_net_hint(e))


def _net_hint(err):
    msg = str(getattr(err, "reason", err))
    if "CERTIFICATE_VERIFY" in msg or "SSL" in msg:
        return ("SSL certificate verification failed — this Python can't find CA "
                "certificates. Fix: run the 'Install Certificates.command' bundled with "
                "python.org Python, or set SSL_CERT_FILE to a CA bundle (e.g. from "
                "`pip install certifi`: SSL_CERT_FILE=$(python3 -m certifi)). Verification "
                "is not disabled because the request carries your API token.")
    return f"Network error contacting Replicate: {msg}"


def create_prediction(model, payload):
    if ":" in model:
        _, version = model.split(":", 1)
        return _request(f"{API}/predictions", "POST",
                        {"version": version, "input": payload}, {"Prefer": "wait"})
    return _request(f"{API}/models/{model}/predictions", "POST",
                    {"input": payload}, {"Prefer": "wait"})


def wait_for(pred, timeout=300):
    deadline = time.time() + timeout
    while pred.get("status") not in ("succeeded", "failed", "canceled"):
        if time.time() > deadline:
            raise RuntimeError("Timed out waiting for the prediction.")
        get_url = (pred.get("urls") or {}).get("get")
        if not get_url:
            raise RuntimeError("No polling URL in the prediction response.")
        time.sleep(2)
        pred = _request(get_url)
    return pred


def collect_urls(output):
    if isinstance(output, str):
        return [output]
    if isinstance(output, dict) and "url" in output:
        return [output["url"]]
    if isinstance(output, list):
        urls = []
        for o in output:
            if isinstance(o, str):
                urls.append(o)
            elif isinstance(o, dict) and "url" in o:
                urls.append(o["url"])
        return urls
    return []


# ---------- model input-schema discovery ----------
def fetch_model_schema(model):
    """Return a normalized list of editable input fields for any Replicate model."""
    base = model.split(":", 1)[0]
    if base in _schema_cache:
        return _schema_cache[base]
    info = _request(f"{API}/models/{base}")
    openapi = (info.get("latest_version") or {}).get("openapi_schema") or {}
    comps = (openapi.get("components") or {}).get("schemas") or {}
    props = (comps.get("Input") or {}).get("properties") or {}

    fields = []
    SKIP = {"user_id", "webhook", "webhook_events_filter"}
    for key, p in props.items():
        low = key.lower()
        if key == "prompt" or low in SKIP or "api_key" in low or "api-key" in low:
            continue  # skip the prompt, credential, and meta passthrough fields
        t = p.get("type")
        if t == "array" or p.get("format") == "uri":
            continue  # skip file/image inputs — text-only generation
        f = {"key": key, "label": key.replace("_", " ").strip().capitalize(),
             "description": p.get("description", ""), "order": p.get("x-order", 999)}

        enum = p.get("enum")
        if not enum and "allOf" in p:
            for sub in p["allOf"]:
                ref = sub.get("$ref")
                if ref:
                    enum = (comps.get(ref.split("/")[-1]) or {}).get("enum")
                    break
        if enum:
            f.update(type="select", options=enum, default=p.get("default", enum[0]))
        elif t in ("integer", "number"):
            f.update(type="number", default=p.get("default"),
                     step=(1 if t == "integer" else "any"))
            if "minimum" in p:
                f["min"] = p["minimum"]
            if "maximum" in p:
                f["max"] = p["maximum"]
        elif t == "boolean":
            f.update(type="checkbox", default=bool(p.get("default", False)))
        else:
            f.update(type="text", default=p.get("default", ""))
        fields.append(f)

    fields.sort(key=lambda f: f["order"])
    _schema_cache[base] = fields
    return fields


# ---------- generation ----------
def run_generation(prompt, model, params):
    if not token():
        raise RuntimeError("REPLICATE_API_TOKEN is not set. Export it or add it to a .env file.")
    payload = {"prompt": prompt}
    if params:
        payload.update(params)
    pred = wait_for(create_prediction(model, payload))
    if pred.get("status") != "succeeded":
        raise RuntimeError(f"Generation {pred.get('status')}: {pred.get('error')}")
    urls = collect_urls(pred.get("output"))
    if not urls:
        raise RuntimeError(f"No image URL in output: {pred.get('output')!r}")

    saved = []
    for url in urls:
        try:
            dreq = urllib.request.Request(url, headers={"User-Agent": "concept-studio/1.0 (+replicate)"})
            with urllib.request.urlopen(dreq) as r:
                data = r.read()
        except urllib.error.URLError as e:
            raise RuntimeError(_net_hint(e))
        name = f"{time.strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:6]}.png"
        (OUT_DIR / name).write_bytes(data)
        meta = {"file": name, "prompt": prompt, "model": model,
                "aspect_ratio": params.get("aspect_ratio", ""), "params": params or {},
                "created": time.time()}
        (OUT_DIR / f"{name}.json").write_text(json.dumps(meta))
        saved.append(meta)
    return saved


def list_gallery():
    metas = []
    for jf in OUT_DIR.glob("*.png.json"):
        try:
            metas.append(json.loads(jf.read_text()))
        except (ValueError, OSError):
            continue
    metas.sort(key=lambda m: m.get("created", 0), reverse=True)
    return metas


# ---------- HTTP server ----------
class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def _json(self, obj, status=200):
        body = json.dumps(obj).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _file(self, path: Path, ctype=None):
        if not path.is_file():
            self._json({"error": "not found"}, 404)
            return
        data = path.read_bytes()
        ctype = ctype or mimetypes.guess_type(str(path))[0] or "application/octet-stream"
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        parsed = urlparse(self.path)
        path, qs = parsed.path, parse_qs(parsed.query)
        if path in ("/", "/index.html"):
            self._file(APP_DIR / "index.html", "text/html; charset=utf-8")
        elif path == "/api/config":
            self._json({"models": PRESET_MODELS, "has_token": bool(token())})
        elif path == "/api/model-schema":
            model = (qs.get("model") or [""])[0]
            if not model:
                self._json({"error": "model required"}, 400); return
            if not token():
                self._json({"error": "REPLICATE_API_TOKEN not set"}, 400); return
            try:
                self._json({"fields": fetch_model_schema(model)})
            except Exception as e:
                self._json({"error": str(e)}, 502)
        elif path == "/api/gallery":
            self._json({"items": list_gallery()})
        elif path.startswith("/outputs/"):
            self._file(OUT_DIR / Path(path).name)
        else:
            self._json({"error": "not found"}, 404)

    def do_POST(self):
        if urlparse(self.path).path != "/api/generate":
            self._json({"error": "not found"}, 404); return
        length = int(self.headers.get("Content-Length", 0))
        try:
            req = json.loads(self.rfile.read(length) or b"{}")
        except ValueError:
            self._json({"error": "invalid JSON body"}, 400); return
        prompt = (req.get("prompt") or "").strip()
        model = (req.get("model") or "").strip()
        params = req.get("params") or {}
        if not prompt:
            self._json({"error": "Prompt is empty."}, 400); return
        if not model:
            self._json({"error": "Pick a model to run."}, 400); return
        if not isinstance(params, dict):
            self._json({"error": "Parameters must be an object."}, 400); return
        try:
            self._json({"items": run_generation(prompt, model, params)})
        except Exception as e:
            self._json({"error": str(e)}, 500)


def pick_port(start):
    import socket
    for p in range(start, start + 25):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(("127.0.0.1", p)) != 0:
                return p
    return start


def main():
    load_dotenv()
    ensure_ca()
    port = pick_port(int(os.environ.get("PORT", "8000")))
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    url = f"http://localhost:{port}"
    tok = "set" if token() else "MISSING — set REPLICATE_API_TOKEN"
    print(f"Concept Studio → {url}  (REPLICATE_API_TOKEN: {tok})", flush=True)
    print("Press Ctrl+C to stop.", flush=True)
    if os.environ.get("NO_BROWSER") != "1":
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
