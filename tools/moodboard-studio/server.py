#!/usr/bin/env python3
"""Local moodboard / storyboard image studio, backed by Replicate.

A tiny local-only web app: edit a prompt, pick a model, generate, and see the
results in a gallery. Intended as a small standalone tool for the storyboarding
/ moodboarding phase of the larger web-game project.

Run:
    pip install replicate
    export REPLICATE_API_TOKEN=...     # or put it in a .env file (see README)
    python server.py
    # open http://localhost:8000

The Replicate API key is read from the environment server-side and is NEVER
sent to the browser.
"""
import json
import os
import time
import uuid
import mimetypes
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

APP_DIR = Path(__file__).resolve().parent
OUT_DIR = APP_DIR / "outputs"
OUT_DIR.mkdir(exist_ok=True)
PORT = int(os.environ.get("PORT", "8000"))

# Preset models shown in the dropdown. You can always type a custom one.
PRESET_MODELS = [
    "google/nano-banana-pro",
    "openai/gpt-image-2",
]

ASPECT_RATIOS = ["16:9", "3:2", "4:3", "1:1", "2:3", "9:16"]


def load_dotenv():
    """Populate env from a .env file (this dir or up to two parents), if present.
    Does not overwrite variables already set in the environment."""
    for base in (APP_DIR, APP_DIR.parent, APP_DIR.parent.parent):
        env = base / ".env"
        if env.is_file():
            for raw in env.read_text().splitlines():
                line = raw.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def read_item_bytes(item):
    """Normalize Replicate output items to raw bytes (file object, URL obj, or str URL)."""
    if hasattr(item, "read"):
        return item.read()
    if hasattr(item, "url") or isinstance(item, str):
        url = item if isinstance(item, str) else item.url
        with urllib.request.urlopen(url) as resp:
            return resp.read()
    raise RuntimeError(f"Unexpected output item type: {type(item)!r}")


def run_generation(prompt, model, aspect_ratio, extra):
    """Call Replicate and save image(s) + metadata sidecars. Returns list of meta dicts."""
    if not os.environ.get("REPLICATE_API_TOKEN"):
        raise RuntimeError(
            "REPLICATE_API_TOKEN is not set. Export it or add it to a .env file."
        )
    try:
        import replicate
    except ImportError:
        raise RuntimeError("Missing dependency. Run: pip install replicate")

    payload = {"prompt": prompt}
    if aspect_ratio and str(aspect_ratio).lower() != "none":
        payload["aspect_ratio"] = aspect_ratio
    if extra:
        payload.update(extra)

    output = replicate.run(model, input=payload)
    items = output if isinstance(output, (list, tuple)) else [output]

    saved = []
    for item in items:
        data = read_item_bytes(item)
        stamp = time.strftime("%Y%m%d-%H%M%S")
        name = f"{stamp}-{uuid.uuid4().hex[:6]}.png"
        (OUT_DIR / name).write_bytes(data)
        meta = {
            "file": name,
            "prompt": prompt,
            "model": model,
            "aspect_ratio": aspect_ratio,
            "extra": extra or {},
            "created": time.time(),
        }
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


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass  # quiet

    def _send_json(self, obj, status=200):
        body = json.dumps(obj).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_file(self, path: Path, content_type=None):
        if not path.is_file():
            self._send_json({"error": "not found"}, 404)
            return
        data = path.read_bytes()
        ctype = content_type or mimetypes.guess_type(str(path))[0] or "application/octet-stream"
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        path = self.path.split("?", 1)[0]
        if path in ("/", "/index.html"):
            self._send_file(APP_DIR / "index.html", "text/html; charset=utf-8")
        elif path == "/api/config":
            self._send_json({
                "models": PRESET_MODELS,
                "aspect_ratios": ASPECT_RATIOS,
                "has_token": bool(os.environ.get("REPLICATE_API_TOKEN")),
            })
        elif path == "/api/gallery":
            self._send_json({"items": list_gallery()})
        elif path.startswith("/outputs/"):
            name = Path(path).name  # prevent traversal
            self._send_file(OUT_DIR / name)
        else:
            self._send_json({"error": "not found"}, 404)

    def do_POST(self):
        if self.path.split("?", 1)[0] != "/api/generate":
            self._send_json({"error": "not found"}, 404)
            return
        length = int(self.headers.get("Content-Length", 0))
        try:
            req = json.loads(self.rfile.read(length) or b"{}")
        except ValueError:
            self._send_json({"error": "invalid JSON body"}, 400)
            return

        prompt = (req.get("prompt") or "").strip()
        model = (req.get("model") or "").strip()
        aspect_ratio = req.get("aspect_ratio") or ""
        extra = req.get("extra") or {}
        if not prompt:
            self._send_json({"error": "Prompt is empty."}, 400)
            return
        if not model:
            self._send_json({"error": "Pick a model to run."}, 400)
            return
        if not isinstance(extra, dict):
            self._send_json({"error": "Advanced inputs must be a JSON object."}, 400)
            return

        try:
            saved = run_generation(prompt, model, aspect_ratio, extra)
        except Exception as e:  # surface Replicate / config errors to the UI
            self._send_json({"error": str(e)}, 500)
            return
        self._send_json({"items": saved})


def main():
    load_dotenv()
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    token = "set" if os.environ.get("REPLICATE_API_TOKEN") else "MISSING"
    print(f"Moodboard Studio → http://localhost:{PORT}  (REPLICATE_API_TOKEN: {token})")
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
