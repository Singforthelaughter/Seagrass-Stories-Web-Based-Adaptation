#!/usr/bin/env python3
"""Render an image prompt to a file via the Replicate HTTP API. Standard library only.

Works anywhere with Python 3 + network + a REPLICATE_API_TOKEN — including Claude Code
(run it through the Bash tool) and Codex. No `pip install` required.

The model is YOURS to choose — set it with --model or the REPLICATE_MODEL env var:
  - official model:        owner/name            e.g. openai/gpt-image-2
                                                 e.g. google/nano-banana-pro
  - pinned community ver:  owner/name:version

This generates from the TEXT PROMPT ONLY — no reference/input images are sent.

Auth:
    export REPLICATE_API_TOKEN=...

Examples:
    python3 scripts/generate.py --model google/nano-banana-pro \
        --prompt-file prompt.txt --aspect-ratio 16:9 --out out/01.png
    cat prompt.txt | python3 scripts/generate.py --model openai/gpt-image-2 \
        --aspect-ratio 3:2 --out out/01.png --input quality=high

Pass any extra model input with --input key=value (repeatable); the value is parsed
as JSON when possible (so numbers/bools/lists work):
    --input quality=high --input number_of_images=2 --input allow_fallback_model=false
"""
import argparse
import json
import os
import sys
import time
import urllib.request
import urllib.error
from pathlib import Path

API = "https://api.replicate.com/v1"


def _request(url, token, method="GET", body=None, extra_headers=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", f"Token {token}")
    req.add_header("Content-Type", "application/json")
    req.add_header("User-Agent", "oceanx-skill/1.0 (+replicate)")
    for k, v in (extra_headers or {}).items():
        req.add_header(k, v)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        detail = e.read().decode(errors="replace")
        raise RuntimeError(f"Replicate API error {e.code}: {detail}")
    except urllib.error.URLError as e:
        raise RuntimeError(net_hint(e))


def net_hint(err):
    msg = str(getattr(err, "reason", err))
    if "CERTIFICATE_VERIFY" in msg or "SSL" in msg:
        return ("SSL certificate verification failed — this Python can't find CA "
                "certificates. Fix: run python.org's 'Install Certificates.command', or set "
                "SSL_CERT_FILE to a CA bundle (e.g. SSL_CERT_FILE=$(python3 -m certifi) after "
                "`pip install certifi`). Not disabling verification — the request carries your token.")
    return f"Network error contacting Replicate: {msg}"


def create_prediction(model, payload, token):
    """Start a prediction. `Prefer: wait` blocks up to ~60s so we often skip polling."""
    if ":" in model:
        name, version = model.split(":", 1)
        return _request(f"{API}/predictions", token, "POST",
                        {"version": version, "input": payload}, {"Prefer": "wait"})
    return _request(f"{API}/models/{model}/predictions", token, "POST",
                    {"input": payload}, {"Prefer": "wait"})


def wait_for(pred, token, timeout=300):
    deadline = time.time() + timeout
    terminal = ("succeeded", "failed", "canceled")
    while pred.get("status") not in terminal:
        if time.time() > deadline:
            raise RuntimeError("Timed out waiting for the prediction.")
        get_url = (pred.get("urls") or {}).get("get")
        if not get_url:
            raise RuntimeError("No polling URL in the prediction response.")
        time.sleep(2)
        pred = _request(get_url, token)
    return pred


def collect_urls(output):
    """Image models return a URL string, a list of URL strings, or {url: ...} objects."""
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


def download(url, path):
    try:
        dreq = urllib.request.Request(url, headers={"User-Agent": "oceanx-skill/1.0 (+replicate)"})
        with urllib.request.urlopen(dreq) as r:
            path.write_bytes(r.read())
    except urllib.error.URLError as e:
        raise RuntimeError(net_hint(e))


def parse_value(v):
    try:
        return json.loads(v)
    except (ValueError, TypeError):
        return v


def main():
    ap = argparse.ArgumentParser(description="Generate an image via the Replicate HTTP API.")
    ap.add_argument("--model", default=os.environ.get("REPLICATE_MODEL"),
                    help="owner/name or owner/name:version. Defaults to $REPLICATE_MODEL.")
    src = ap.add_mutually_exclusive_group()
    src.add_argument("--prompt", help="Prompt text.")
    src.add_argument("--prompt-file", help="Read the prompt from this file.")
    ap.add_argument("--out", required=True, help="Output image path.")
    ap.add_argument("--aspect-ratio", default="16:9",
                    help="Aspect ratio, e.g. 16:9, 3:2. Use 'none' to omit (default: 16:9).")
    ap.add_argument("--input", action="append", default=[], metavar="KEY=VALUE",
                    help="Extra model input; repeatable. Value parsed as JSON when possible.")
    args = ap.parse_args()

    # Best-effort CA bundle (avoids macOS CERTIFICATE_VERIFY_FAILED) without disabling verification.
    if not os.environ.get("SSL_CERT_FILE"):
        try:
            import certifi
            os.environ["SSL_CERT_FILE"] = certifi.where()
        except ImportError:
            pass

    token = os.environ.get("REPLICATE_API_TOKEN")
    if not token:
        sys.exit("REPLICATE_API_TOKEN is not set. Export it (or add it to a .env you source).")
    if not args.model:
        sys.exit("No model set. Use --model or export REPLICATE_MODEL "
                 "(e.g. openai/gpt-image-2, google/nano-banana-pro).")

    if args.prompt_file:
        prompt = Path(args.prompt_file).read_text()
    elif args.prompt:
        prompt = args.prompt
    else:
        prompt = sys.stdin.read()
    prompt = prompt.strip()
    if not prompt:
        sys.exit("Empty prompt.")

    payload = {"prompt": prompt}
    if args.aspect_ratio and args.aspect_ratio.lower() != "none":
        payload["aspect_ratio"] = args.aspect_ratio
    for pair in args.input:
        if "=" not in pair:
            sys.exit(f"Bad --input {pair!r}; expected KEY=VALUE.")
        k, v = pair.split("=", 1)
        payload[k] = parse_value(v)

    print(f"[generate] model={args.model} aspect={args.aspect_ratio}", file=sys.stderr)
    pred = create_prediction(args.model, payload, token)
    pred = wait_for(pred, token)
    if pred.get("status") != "succeeded":
        sys.exit(f"Generation {pred.get('status')}: {pred.get('error')}")

    urls = collect_urls(pred.get("output"))
    if not urls:
        sys.exit(f"No image URL in output: {pred.get('output')!r}")

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    if len(urls) == 1:
        download(urls[0], out)
        print(out)
    else:
        for i, u in enumerate(urls, 1):
            p = out.with_name(f"{out.stem}-{i}{out.suffix}")
            download(u, p)
            print(p)


if __name__ == "__main__":
    main()
