# OceanX Scene Shots

> Photorealistic photos of real people using an OceanX web experience — at a museum/exhibition or at home.
>
> Documentary look · candid engagement · exhibition kiosks, touch tables, curved screens, home desktops · the project's real UI on screen

A skill that guides an AI agent to generate **in-context usage photos** of an OceanX web experience: kids and families at a museum kiosk or touch table, students at a big curved data screen, or someone at home on a laptop or tablet. The defining rule — **the screen shows the actual project content** (its title, UI, charts, simulator, or game), derived from what the experience really is.

This is the photorealistic companion to the line-art **`oceanx-storyboards`** skill. Use storyboards for clean numbered walkthroughs; use this for "people actually using it" imagery.

Works as both a **Claude Code skill** and a **Codex skill** from the same folder.

## What it produces

- Exhibition shots: wall kiosk, round touch table, large curved panoramic screen, companion tablet
- Home shots: desktop/laptop at a desk, tablet on a couch
- Photorealistic, candid, naturally-lit — landing-page / grant-deck quality

It does **not** produce illustrations, line-art, 3D renders, or the numbered storyboards (that's `oceanx-storyboards`).

## Photographic style

- Realistic editorial/documentary photography, natural light, shallow depth of field
- Authentic, varied, candid casting; one clear primary actor mid-interaction
- Exhibition: dim blue gallery, screen-lit faces, blurred visitors; OceanX-branded facilitator shirts where it fits
- Home: warm daylight, cozy props (mug, plant, books)
- The project's real content glowing on the device — never a generic dashboard
- Never illustrated, never CGI/uncanny, never stocky/posed, no fake holograms or watermarks

## Install

### Claude Code

```bash
mkdir -p "$HOME/.claude/skills"
cp -R ./oceanx-scene-shots "$HOME/.claude/skills/"
```

### Codex

```bash
mkdir -p "${CODEX_HOME:-$HOME/.codex}/skills"
cp -R ./oceanx-scene-shots "${CODEX_HOME:-$HOME/.codex}/skills/"
```

```text
Use $oceanx-scene-shots to generate photorealistic photos of people using this OceanX web experience in context.
```

> Copy the inner `oceanx-scene-shots/` folder (this directory), not the repo root.

## Generating images (Replicate)

Images render through [Replicate](https://replicate.com) via `scripts/generate.py`. **You choose the model** — the script never hardcodes one.

```bash
pip install replicate
export REPLICATE_API_TOKEN=your_token
export REPLICATE_MODEL=openai/gpt-image-2   # or google/nano-banana-pro, or any image model

python scripts/generate.py \
  --prompt-file prompt.txt \
  --aspect-ratio 3:2 \
  --out assets/output/coral-simulator/01-exhibition-kiosk.png
```

- Set the model with `REPLICATE_MODEL` or per-call `--model`.
- Add model-specific options with repeatable `--input key=value` (e.g. `--input quality=high`).
- Handles both Replicate output shapes — list (`gpt-image-2`) and single (`nano-banana-pro`).
- Generates from the text prompt only; no reference images are sent.

## Usage

### Exhibition usage photos

```text
Use $oceanx-scene-shots — generate 3 photorealistic exhibition photos of kids and a family using the Coral Bleach Response Simulator.
Show the real UI on screen: reef scene, "Water Temperature" slider, Reef Health / Acidity / Temperature charts.
```

### At-home usage photos

```text
Use $oceanx-scene-shots — generate a cozy at-home photo of a student playing our pixel-art ocean game on a desktop.
On screen: "Ecosystem Health" bar, "Current Depth" readout, a bioluminescent squid.
```

### Plan the on-screen content first

```text
Use $oceanx-scene-shots — before generating, read this project and tell me exactly what should be on the screen in each shot, then propose 4 scenes (settings + cast).

<paste project content / web app description>
```

## Structure

```text
oceanx-scene-shots/
├── SKILL.md                  entry point: trigger description + workflow
├── agents/
│   └── openai.yaml           Codex registration
├── scripts/
│   ├── generate.py           Replicate renderer (model is yours to set)
│   └── requirements.txt      pip install replicate
├── references/
│   ├── photo-style.md        realism, lighting, lens, never-rules
│   ├── cast-and-settings.md  who's in the shot + exhibition vs. home
│   ├── scene-patterns.md     shot types + freshness rule
│   ├── prompt-template.md    fill-in prompts (incl. on-screen-content block)
│   └── qa-checklist.md       pass/fail + iteration
└── assets/
    └── examples/             style-calibration photos (not templates to copy)
```

## Notes

- The most important block in the prompt is the **on-screen content** — always tie it to the real project (title, main visual, one or two real controls).
- AI photos often garble on-screen text; keep it short and run the QA checklist, then locally edit titles if needed.
- Cast and light should match the setting; exhibition is dim and screen-lit, home is warm and daylit.
- Example photos calibrate realism, lighting, and framing — don't reproduce exact people or compositions.

Sibling of [oceanx-storyboards](../oceanx-storyboards/README.md); both adapt the structure of [ian-xiaohei-illustrations](https://github.com/helloianneo/ian-xiaohei-illustrations).
