# Concept Studio

A tiny **local** web app for generating **storyboards, photoreal scene shots, and freeform concept art** via [Replicate](https://replicate.com). Edit a prompt, choose a model, generate, and browse the results in a gallery. Built for the early visual phase of the larger web-game project.

- **Local only** — binds to `127.0.0.1`, no external hosting.
- **Standard library only** — no `pip install`; needs just Python 3 + a token.
- **Your API key stays server-side** — read from the environment, never sent to the browser.
- **Style presets** — Freeform, Storyboard, or Scene shot (type only the subject and the studio adds the style).
- **Any model** — presets plus a custom field; parameter controls are **auto-discovered** from each model's Replicate schema.

## Easiest way to run (via Codex / Claude Code)

Just ask the agent: *"launch the concept studio"* (the `concept-studio` skill). Or run the launcher yourself:

```bash
tools/concept-studio/launch.sh
```

It loads the token from a `.env` if present, picks a free port, starts the server, and opens your browser. Headless: `NO_BROWSER=1 tools/concept-studio/launch.sh`.

## Manual run

```bash
# token — either export it, or put it in a .env (repo root or this folder); both git-ignored
export REPLICATE_API_TOKEN=your_token

cd tools/concept-studio
python3 server.py          # auto-picks a free port + opens the browser
```

`PORT=9000 python3 server.py` to suggest a starting port.

> Open the **printed localhost URL in a real browser** — the editor's preview panel can't run the backend, so the model dropdown and gallery will appear disconnected there.

## Using it

1. Pick a **Style**: Freeform (write the whole prompt) · Storyboard / Scene shot (type only the *subject*; the studio prepends the matching style block).
2. Pick a **model** — a preset or "Custom…" for any `owner/model-name`.
3. Edit the **parameters** — auto-loaded from the model's Replicate schema as dropdowns / number fields / checkboxes (e.g. `nano-banana-pro`'s real aspect-ratio + resolution options). A model whose schema can't be fetched falls back to add-your-own key/value rows.
4. **Generate** — a placeholder shows while it runs (10–60s); finished images appear newest-first.

Generated PNGs + metadata save to `outputs/` (git-ignored) and persist across restarts.

## Notes

- The top-right badge shows token / connection status.
- Generation is text-prompt only (no reference images), matching the project's image skills.
- Same model/output conventions as the `oceanx-storyboards` and `oceanx-scene-shots` skills — prompts move between them freely.

## Files

```text
tools/concept-studio/
├── launch.sh          one-command launcher (sources .env, free port, opens browser)
├── server.py          stdlib HTTP server + Replicate HTTP API + model-schema discovery
├── index.html         single-file UI (style presets, model picker, auto params, gallery)
├── requirements.txt   (none — standard library only)
└── outputs/           generated images + .json metadata (git-ignored)
```
