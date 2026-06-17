---
name: oceanx-scene-shots
description: Generate photorealistic in-context photos of real people using an OceanX web experience — at a museum/exhibition kiosk, touch table, or big screen, or at home on a laptop or tablet. Use when the user wants "usage photos", "in-context shots", "lifestyle photos", "exhibition photos", "people using the app", "hero images", "marketing/promo imagery", "concept renders of the experience in use", or "what it looks like when someone plays/uses this". The on-screen content must reflect the actual project (its UI, charts, simulator, or game). This is photorealistic photography — NOT the line-art storyboards (see the separate oceanx-storyboards skill).
---

# OceanX Scene Shots

## What this is

Generate photorealistic, documentary-style photos of people **using an OceanX web experience in a real setting** — kids and families at a museum kiosk, students at a touch table or curved exhibition screen, or someone at home on a laptop or tablet. The point is to show the experience *in context, in use*, with the **project's real content visible on the screen**.

This is editorial/lifestyle photography, not illustration. If the user wants clean line-art numbered walkthroughs, that is the separate **`oceanx-storyboards`** skill — use that instead.

The defining requirement: **the screen content is derived from the actual project**. Read what the web experience actually is — its name, its UI, its charts, its simulator controls, its game — and depict that believably on the device in the shot.

## Read these references first

Load on demand; don't dump them all into context:

- `references/photo-style.md` — the photographic look: realism, lighting, lens, mood, color, hard "never" rules.
- `references/cast-and-settings.md` — who's in the shot (visitors, families, OceanX facilitators) and the two environments (exhibition vs. home).
- `references/scene-patterns.md` — the shot types (wall kiosk, touch table, curved big screen, home desktop, tablet companion) and how to choose.
- `references/prompt-template.md` — the single-image prompt template with fill-in variables, including the on-screen-content block.
- `references/qa-checklist.md` — post-generation pass/fail and iteration.
- `assets/examples/` — style calibration only. Match the realism and framing energy; don't copy exact people or compositions.

## Workflow

### 1. Digest the project content

Before describing any scene, understand what is actually on the screen. Read the project: the web experience's name, what it does, its UI, key screens, charts, simulator sliders, map/data views, or game mechanics. Pull concrete, depictable details:

- The product/screen title (e.g. "Coral Bleach Response Simulator", "DataXplorer")
- The main visual on screen (a reef scene, an ocean heatmap, charts like Reef Health / Acidity / Temperature, a pixel-art game)
- The controls visible (sliders like "Water Temperature", a map, a depth readout, an ecosystem-health bar)
- Branding (OceanX) where appropriate

If the project content is unknown, ask the user for it or make a clearly-labeled reasonable stand-in — but prefer real details.

### 2. Pick setting and shot type

Decide exhibition vs. home, and the shot type from `references/scene-patterns.md`. Default to exhibition unless the user asks for at-home use. Match the cast to the setting (families/students/facilitators for exhibition; an individual or small group for home).

### 3. Generate, one image at a time

If the user clearly says "generate / make / produce the photos", don't stop to confirm — generate one scene per image via Replicate, using the bundled script:

```bash
python scripts/generate.py \
  --prompt-file <prompt.txt> \
  --aspect-ratio 3:2 \
  --out assets/output/<experience-slug>/01-<slug>-exhibition-kiosk.png
```

The **model is the user's choice** — do not hardcode or pick one. It comes from `--model` or the `REPLICATE_MODEL` env var (e.g. `openai/gpt-image-2`, `google/nano-banana-pro`); if neither is set, ask the user which model to run. Auth needs `REPLICATE_API_TOKEN`. Pass model-specific options with repeatable `--input key=value`. Generate from the text prompt only — do not send reference/input images. These shots read well at 3:2 or 16:9.

Each prompt must include:

- Photorealistic documentary/editorial photography (not illustration, not 3D render)
- The setting (museum exhibition with dim blue ambient + spotlights, or a cozy home with daylight)
- The cast (authentic, candid, engaged; OceanX-branded shirts for facilitators when relevant)
- The device and **the project's actual on-screen content**
- Natural lighting, shallow depth of field, believable interaction (pointing, touching, watching)

### 4. Check and iterate

Run `references/qa-checklist.md`. Regenerate or edit if the screen content is wrong/generic, the people look uncanny or posed-stocky, the lighting is flat, text on screen is garbled beyond a believable level, or it drifts into illustration/render.

### 5. Save and deliver

If working inside the repo, copy finals to:

```text
skills/oceanx-scene-shots/assets/output/<experience-slug>/
```

Name in order, with setting in the slug:

```text
01-<experience-slug>-exhibition-kiosk.png
02-<experience-slug>-home-desktop.png
```

Preserve originals; don't overwrite unless asked.

## Output discipline

Report how many images, each one's setting + shot type, what's on screen, the save paths, and which renders are strongest. Note that screen text in AI photos is often imperfect — call out any image where the on-screen title or labels read wrong so the user can regenerate or retouch.
