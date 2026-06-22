---
name: game-cover
description: Generate a cover or thumbnail image for the Seagrass Stories game using the project's Replicate image model. Use when the user asks for a game cover, thumbnail, key art, splash image, promo art, or OG/social preview image.
---

# Game cover / thumbnail generator

Generates on-brand key art for **Seagrass Stories** (the underwater seagrass-restoration
game in this repo) via Replicate, using **Nano Banana Pro** (`google/nano-banana-pro`)
for higher-fidelity cover art — authenticated with the same `REPLICATE_API_TOKEN` the
game already uses. (This is independent of the game's `REPLICATE_MODEL`, which is tuned
for flat wetsuit textures, not key art.)

## How to run

```bash
node .claude/skills/game-cover/generate-cover.mjs "<optional idea>" [--aspect <ratio>] [--out <path>] [--model <id>]
```

- **idea** (optional positional): a short phrase to emphasise, e.g. `"sunset, a turtle in the foreground"`. The script already bakes in the game's identity/style, so this is just the accent — it works with no idea at all.
- **--aspect**: image ratio. Default `16:9`. Use `1:1` for a thumbnail/icon, `9:16` for a mobile splash, `1.91:1` for an OG social-preview image.
- **--out**: where to save. Default `public/cover.png`. Use a descriptive name for variants (e.g. `public/thumbnail.png`, `public/og-image.png`).
- **--model**: override the image model. Default `google/nano-banana-pro`.

## What to do

1. Confirm `REPLICATE_API_TOKEN` is available — the script reads it from the environment or the project's `.env` / `.env.local`. If it's missing, tell the user and stop (don't print the token).
2. Run the command with the user's idea/aspect/filename. It blocks ~20–60s while the image generates, polling if needed.
3. After it saves, show the result with the SendUserFile tool so the user can see it, and report the output path.
4. If the user wants tweaks (different mood, aspect, focal subject), re-run with an updated idea/aspect rather than editing the script.

## Common requests → flags

- "Make a thumbnail" → `--aspect 1:1 --out public/thumbnail.png`
- "Social / OpenGraph preview" → `--aspect 1.91:1 --out public/og-image.png`
- "Phone splash screen" → `--aspect 9:16 --out public/splash.png`
- "Cover with a dugong, more sunset" → pass that as the idea string.

## Notes

- The model and style are intentionally consistent with the in-game art so covers match the game's look.
- The script never commits or deploys; do that only if the user asks.
- To wire a generated OG image into the app, set it in the relevant `metadata` (e.g. `app/layout.tsx` `openGraph.images`) — only if the user asks.
