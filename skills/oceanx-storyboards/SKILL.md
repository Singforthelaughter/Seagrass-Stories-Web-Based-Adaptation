---
name: oceanx-storyboards
description: Generate clean, friendly process storyboards and explainer illustrations for OceanX web experiences and ocean-education materials. Use when the user wants to demo, pitch, document, or storyboard an interactive web experience, AR exhibit, kiosk, or educational web game — or asks for a "storyboard", "process diagram", "step-by-step illustration", "explainer graphic", "shot list", "user-journey illustration", "walkthrough", "wireflow", or "concept illustration". Default look: wide horizontal strip of numbered panels, navy step circles, teal block arrows, minimalist black stick-figure actors, light-blue AR/water/screen washes, clean white background.
---

# OceanX Storyboards

## What this is

Generate wide horizontal **process storyboards** and **explainer illustrations** for OceanX web experiences, AR/interactive exhibits, kiosks, and ocean-education web games. The job is not to make polished marketing art, flat corporate vector illustration, or a literal UI mockup — it is to turn a web experience or lesson into a **clear numbered walkthrough** a viewer understands in a few seconds.

The recurring visual language is the **stick-figure actor** doing the work: a minimalist black line-art person who points, places a sample, holds a tablet, watches a screen, reacts. The actor must perform the core action of each step, not stand beside it as decoration. The mood is a calm, friendly, museum-exhibit explainer — clean and a little techy, never cute-cartoon, never photorealistic.

## Read these references first

Load on demand. Do not stuff them all into context at once:

- `references/style-dna.md` — the look: palette, must-haves, hard "never" rules.
- `references/stick-figure-cast.md` — the actors (visitor, facilitator), poses, emotion-by-posture, forbidden treatments.
- `references/storyboard-patterns.md` — layout types (numbered strip, before/after, single exhibit scene, interaction loop, ecosystem, game-flow) and how to choose.
- `references/prompt-template.md` — the single-image prompt template with fill-in variables.
- `references/qa-checklist.md` — post-generation pass/fail and iteration rules.
- `assets/examples/` — low-frequency style calibration only. Do not copy a panel's exact composition, props, or labels.

## Workflow

### 1. Digest the experience

Read what the user gives you: the web-experience concept, AR/exhibit flow, game design doc, lesson outline, script, Notion page, Markdown, or screenshots. Extract:

- What is the experience or lesson actually about?
- What is the sequence the visitor moves through? (the steps)
- Where does an interaction, a transformation, or a "shift" happen? (the memorable beats)
- What is the single takeaway?

Do not illustrate every sentence. Pick the **beats that carry the journey**: the entry moment, each distinct interaction, the transformation/payoff, a before→after shift, and the takeaway.

### 2. Propose a shot list first

If the user only asks you to plan ("how should we storyboard this / which steps need a panel"), output a shot list before generating. For each panel write:

- Step number and short title (the navy-circle title)
- What the actor is doing
- The key prop / screen / object
- What the panel communicates in one line
- Suggested short on-image labels

Default 3–6 panels. Very short experiences: 2–3. Long flows: don't casually exceed 7 — split into multiple strips instead of cramming.

### 3. Generate, one image at a time

If the user clearly says "generate / make it / produce the storyboard", don't stop to confirm — generate **each panel-strip as its own image** via Replicate. Do not try to pack unrelated storyboards into one render.

Render with the bundled script (it reads a prompt and writes a PNG):

```bash
python scripts/generate.py \
  --prompt-file <prompt.txt> \
  --aspect-ratio 16:9 \
  --out assets/output/<experience-slug>/01-<slug>.png
```

The **model is the user's choice** — do not hardcode or pick one. It comes from `--model` or the `REPLICATE_MODEL` env var (e.g. `openai/gpt-image-2`, `google/nano-banana-pro`); if neither is set, ask the user which model to run. Auth needs `REPLICATE_API_TOKEN` in the environment. Pass model-specific options with repeatable `--input key=value` (e.g. `--input output_format=png`). Generate from the text prompt only — do not send reference/input images. Storyboards want a wide ratio (16:9).

A "storyboard" here is usually a single wide image containing the numbered panels in sequence. Each prompt must include:

- Wide horizontal storyboard, white background
- Numbered navy step circles + bold navy step titles
- Teal block arrows between panels
- Minimalist black stick-figure actor performing each step's core action
- Light-blue / cyan washes for screens, water, AR, and digital fields
- Lots of clean whitespace
- Forbidden: photorealism, 3D render, dense text, drop shadows/heavy textures, cute mascot, flat stock-vector look

### 4. Check and iterate

Run `references/qa-checklist.md`. Regenerate or locally edit if:

- Stick figures are detailed/photoreal instead of clean line art
- Panels are crowded or text-heavy
- It reads like a literal UI mockup or a stock-vector poster
- Step numbers/titles are missing, misnumbered, or garbled
- Arrows aren't teal, or the palette drifted into full-color fills
- Background isn't clean white

### 5. Save and deliver

If working inside the repo, copy finals to:

```text
skills/oceanx-storyboards/assets/output/<experience-slug>/
```

Name in order:

```text
01-<experience-slug>.png
02-<experience-slug>.png
```

Preserve originals; don't overwrite existing assets unless the user asks to replace.

## Output discipline

Pre-generation planning should be short and concrete. Post-generation delivery should report:

- How many images were generated
- What each one shows / where it goes in the experience
- The save paths
- Which renders are strongest and which are optional

Let the storyboards do the talking — don't write long style theory.
