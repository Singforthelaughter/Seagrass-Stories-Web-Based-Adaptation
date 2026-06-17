#!/usr/bin/env python3
"""Render an image prompt to a file via Replicate.

The model is YOURS to choose — set it with --model or the REPLICATE_MODEL
env var. This script does not hardcode a model.

Different Replicate models return different output shapes. This script
normalizes both:
  - list form  (e.g. openai/gpt-image-2  -> output[0].read())
  - single form (e.g. google/nano-banana-pro -> output.read())
...and also a plain URL string, if a model returns that.

It generates from the TEXT PROMPT ONLY — no reference/input images are sent
to the model.

Auth:
  export REPLICATE_API_TOKEN=...

Pick a model:
  export REPLICATE_MODEL=google/nano-banana-pro
  # or pass --model openai/gpt-image-2 per call

Examples:
  python scripts/generate.py --prompt-file prompt.txt --out assets/output/demo/01.png
  python scripts/generate.py --model openai/gpt-image-2 \
      --prompt "..." --aspect-ratio 3:2 --out 01.png
  cat prompt.txt | python scripts/generate.py --out 01.png --aspect-ratio 16:9

Pass any extra model-specific input with --input key=value (repeatable);
the value is parsed as JSON when possible:
  --input quality=high          (openai/gpt-image-2)
  --input resolution=2K         (google/nano-banana-pro)
  --input output_format=png
"""
import argparse
import json
import os
import sys
from pathlib import Path

try:
    import replicate
except ImportError:
    sys.exit("Missing dependency. Install it with:  pip install replicate")


def parse_value(v):
    """Parse a --input value as JSON (numbers, bools, lists), else keep as string."""
    try:
        return json.loads(v)
    except (ValueError, TypeError):
        return v


def main():
    ap = argparse.ArgumentParser(description="Generate an image via Replicate.")
    ap.add_argument(
        "--model",
        default=os.environ.get("REPLICATE_MODEL"),
        help="Replicate model id, e.g. openai/gpt-image-2 or google/nano-banana-pro. "
        "Defaults to $REPLICATE_MODEL.",
    )
    src = ap.add_mutually_exclusive_group()
    src.add_argument("--prompt", help="Prompt text.")
    src.add_argument("--prompt-file", help="Read the prompt from this file.")
    ap.add_argument("--out", required=True, help="Output image path.")
    ap.add_argument(
        "--aspect-ratio",
        default="16:9",
        help="Aspect ratio, e.g. 16:9, 3:2, 4:3. Use 'none' to omit (default: 16:9).",
    )
    ap.add_argument(
        "--input",
        action="append",
        default=[],
        metavar="KEY=VALUE",
        help="Extra model input; repeatable. Value parsed as JSON when possible.",
    )
    args = ap.parse_args()

    if not args.model:
        sys.exit(
            "No model set. Use --model or export REPLICATE_MODEL "
            "(e.g. openai/gpt-image-2, google/nano-banana-pro)."
        )

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
    output = replicate.run(args.model, input=payload)

    # Normalize output: list -> first item; otherwise the item itself.
    item = output[0] if isinstance(output, (list, tuple)) else output

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)

    if hasattr(item, "read"):
        data = item.read()
    elif hasattr(item, "url") or isinstance(item, str):
        import urllib.request

        url = item if isinstance(item, str) else item.url
        with urllib.request.urlopen(url) as resp:
            data = resp.read()
    else:
        sys.exit(f"Unexpected output type from model: {type(item)!r}")

    out.write_bytes(data)
    print(str(out))


if __name__ == "__main__":
    main()
