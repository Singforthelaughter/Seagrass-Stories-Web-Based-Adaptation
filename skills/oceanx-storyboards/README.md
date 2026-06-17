# OceanX Storyboards

> Turn an OceanX web experience or ocean-education web game into a clean numbered walkthrough.
>
> Wide horizontal strip · navy step circles · teal arrows · minimalist stick-figure actors · light-blue AR/water washes · clean white background

A skill that guides an AI agent to generate **process storyboards and explainer illustrations** for OceanX web experiences, AR/interactive exhibits, kiosks, and educational web games. It is not a marketing-art generator or a UI mockup tool — it turns a flow or a lesson into a numbered strip a viewer understands in a few seconds.

Works as both a **Claude Code skill** and a **Codex skill** from the same folder.

## What it produces

- Wide horizontal **numbered step strips** (the default look)
- Before/after shifts, single exhibit scenes, interaction loops, ecosystem maps, game-flow boards
- A **shot list** first when you only want planning
- Final PNGs saved under `assets/output/<experience-slug>/`

It does **not** produce PPTX/PDF, editable SVG/vector source, polished marketing KV, or literal UI screenshots.

## Visual style

- Clean white background, lots of whitespace
- Dark-navy numbered circles + bold navy step titles
- Chunky teal/cyan block arrows for the flow
- Minimalist black **stick-figure actors** performing each step's core action
- Soft light-blue washes for screens, water, AR, and digital fields
- Warm accent (a fish, a highlight) on at most one or two tiny elements
- Never photoreal, never cute-mascot, never a stock-vector poster

## Install

### Claude Code

```bash
mkdir -p "$HOME/.claude/skills"
cp -R ./oceanx-storyboards "$HOME/.claude/skills/"
```

Then in Claude Code the skill triggers on storyboard / process-diagram / explainer / web-experience-demo requests, or invoke it explicitly.

### Codex

```bash
mkdir -p "${CODEX_HOME:-$HOME/.codex}/skills"
cp -R ./oceanx-storyboards "${CODEX_HOME:-$HOME/.codex}/skills/"
```

Then:

```text
Use $oceanx-storyboards to storyboard this OceanX web experience into a clean numbered process strip.
```

> Note: copy the inner `oceanx-storyboards/` folder (this directory), not the repo root.

## Generating images (Replicate)

Images render through [Replicate](https://replicate.com) via `scripts/generate.py`. **You choose the model** — the script never hardcodes one.

```bash
pip install replicate
export REPLICATE_API_TOKEN=your_token
export REPLICATE_MODEL=google/nano-banana-pro   # or openai/gpt-image-2, or any image model

python scripts/generate.py \
  --prompt-file prompt.txt \
  --aspect-ratio 16:9 \
  --out assets/output/coral-recognition/01-coral.png
```

- Set the model with `REPLICATE_MODEL` or per-call `--model`.
- Add model-specific options with repeatable `--input key=value` (e.g. `--input output_format=png`), value parsed as JSON when possible.
- Handles both Replicate output shapes — list (`gpt-image-2`) and single (`nano-banana-pro`).
- Generates from the text prompt only; no reference images are sent.

## Usage

### Plan only (shot list)

```text
Use $oceanx-storyboards — don't generate yet.
Read this web-experience concept and propose a 4–5 panel shot list:
step title, what the actor does, key prop/screen, the one-line point, suggested labels.

<paste concept / game design / lesson>
```

### Generate a storyboard

```text
Use $oceanx-storyboards — generate a wide numbered storyboard for this experience.
Style: white background, navy numbered circles, teal arrows, stick-figure actors, light-blue AR/water washes.

<paste concept>
```

### Edit a render

```text
Use $oceanx-storyboards — remove the stray "Step 3" subtitle from this image and keep everything else unchanged.
```

## Structure

```text
oceanx-storyboards/
├── SKILL.md                 entry point: trigger description + workflow
├── agents/
│   └── openai.yaml          Codex registration
├── scripts/
│   ├── generate.py          Replicate renderer (model is yours to set)
│   └── requirements.txt     pip install replicate
├── references/
│   ├── style-dna.md         palette + must/never rules
│   ├── stick-figure-cast.md the actors + poses + forbidden treatments
│   ├── storyboard-patterns.md layout types + freshness rule
│   ├── prompt-template.md   fill-in image prompts (+ edit prompts)
│   └── qa-checklist.md      pass/fail + iteration
└── assets/
    └── examples/            style-calibration images (not templates to copy)
```

## Notes

- Keep on-image text short — fewer words render more reliably.
- One core action per panel; don't turn a strip into a manual.
- The stick figure must carry the action; if removing it leaves the panel unchanged, it was decoration.
- Example images calibrate line weight, palette restraint, whitespace, and actor participation — don't copy their compositions.
- Image models drift (garbled labels, extra titles, palette creep) — always run the QA checklist after generating.

Adapted from the structure of [ian-xiaohei-illustrations](https://github.com/helloianneo/ian-xiaohei-illustrations) (a Codex illustration skill), restyled for OceanX storyboards.
