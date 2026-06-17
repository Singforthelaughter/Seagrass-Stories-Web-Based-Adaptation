---
name: concept-studio
description: Launch the local Concept Studio — a browser tool for generating storyboard, scene-shot, and freeform concept images via Replicate. Use when the user says "open/launch/start the concept studio", "open the image studio", "start the moodboard tool", "let me generate images in a UI", or wants a local web interface to edit prompts, pick a model, and browse generated images. This starts a local server in the project; it is not an image generator itself (for headless generation use the oceanx-storyboards / oceanx-scene-shots skills).
---

# Concept Studio (launcher)

A convenience skill that starts the project's **Concept Studio** — a local, browser-based image-generation tool. It is repo-local: the studio lives at `tools/concept-studio/` in this project.

## How to launch

1. **Preflight the token.** The studio needs `REPLICATE_API_TOKEN`. It will auto-load it from a `.env` (in `tools/concept-studio/` or the repo root). If neither the env var nor a `.env` has it, tell the user to `export REPLICATE_API_TOKEN=...` or add it to a `.env` — never ask them to paste the key into chat, and never print it.

2. **Run the launcher** from the repo root (it sources `.env`, picks a free port, starts the stdlib server, and opens the browser):

   ```bash
   tools/concept-studio/launch.sh
   ```

   Headless / no auto-open: `NO_BROWSER=1 tools/concept-studio/launch.sh`.
   It needs only **Python 3** — no `pip install`.

3. **Report the URL** the server prints (e.g. `http://localhost:8000`) so the user can open it. The server keeps running in the foreground; if you run it for the user, start it in the background and hand them the URL.

## What the user can do in it

- Pick a **Style** (Freeform / Storyboard / Scene shot). In Storyboard/Scene-shot mode they type only the *subject* and the studio adds the matching style block.
- **Choose a model** (presets or any custom `owner/name`); parameter controls are **auto-discovered** from the model's Replicate schema.
- **Edit the prompt**, generate, and browse results in a gallery (saved under `tools/concept-studio/outputs/`, git-ignored).

## Don't

- Don't paste, request, or echo the API key.
- Don't treat this as the generator — for scripted/headless image generation, use `oceanx-storyboards` or `oceanx-scene-shots` and their `scripts/generate.py`.
