# Moodboard Studio

A tiny **local** web app for generating storyboard / moodboard images via [Replicate](https://replicate.com). Edit a prompt, choose which model to run, generate, and browse the results in a gallery. Built as a small standalone tool for the early visual phase of the larger web-game project.

- **Local only** — binds to `127.0.0.1`, no external hosting.
- **Your API key stays server-side** — read from the environment, never sent to the browser.
- **You choose the model** — presets in a dropdown plus a custom field.
- **Handles both Replicate output shapes** (list like `gpt-image-2`, single like `nano-banana-pro`).

## Setup

```bash
cd tools/moodboard-studio
pip install -r requirements.txt
```

Provide your Replicate token one of two ways (both keep it out of git):

```bash
# A) export for the session
export REPLICATE_API_TOKEN=your_token

# B) or a .env file at the repo root (already git-ignored)
echo 'REPLICATE_API_TOKEN=your_token' > ../../.env
```

## Run

```bash
python server.py
# → open http://localhost:8000
```

Use a different port with `PORT=9000 python server.py`.

## Using it

1. Type or paste a **prompt** (the gallery's "Reuse prompt" button refills it from a past image).
2. Pick a **model** — a preset, or "Custom…" to type any `owner/model-name`.
3. Pick an **aspect ratio**.
4. Optionally open **Advanced model inputs** and add model-specific params as JSON, e.g.
   - `gpt-image-2`: `{"quality":"high","output_format":"png"}`
   - `nano-banana-pro`: `{"resolution":"2K"}`
5. **Generate** — a placeholder shows while it runs (10–60s); finished images appear newest-first.

Generated PNGs and their metadata sidecars are saved to `outputs/` (git-ignored) and persist across restarts, so the gallery is your running moodboard.

## Notes

- The top-right badge shows whether a token was detected at startup. If it says *missing*, set the token and restart.
- Generation is text-prompt only (no reference images), matching the project's image skills.
- This shares the same model/output conventions as the `oceanx-storyboards` and `oceanx-scene-shots` skills — prompts you like here can be dropped straight into those skills (and vice-versa).

## Files

```text
tools/moodboard-studio/
├── server.py          stdlib HTTP server + Replicate calls (key stays server-side)
├── index.html         single-file UI (prompt, model picker, gallery, lightbox)
├── requirements.txt   replicate
└── outputs/           generated images + .json metadata (git-ignored)
```
