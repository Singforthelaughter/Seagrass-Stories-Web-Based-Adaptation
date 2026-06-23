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

## Generating images (runtime)

This skill does **not** assume a built-in image tool. It ships its own renderer: `scripts/generate.py`, which calls the Replicate HTTP API using only the Python standard library — so it runs the same way on **Claude Code** (via the Bash tool), Codex, or a local shell, with no `pip install`.

Preflight, every time before generating:

1. Confirm `REPLICATE_API_TOKEN` is set in the environment. If it's missing, tell the user to `export REPLICATE_API_TOKEN=...` (or source a `.env`) and stop — do not ask for or print the key.
2. Confirm a model is chosen — `REPLICATE_MODEL` or a `--model` value (e.g. `openai/gpt-image-2`, `google/nano-banana-pro`). If neither is set, ask the user which model to run; never hardcode one.

Run the script with the path to *this skill's* `scripts/generate.py` (resolve it relative to this SKILL.md's directory; on Claude Code that's typically `~/.claude/skills/oceanx-storyboards/scripts/generate.py`). Save outputs under **this skill's own folder**: `assets/output/<experience-slug>/` (it's git-ignored). If a host *does* provide a built-in image tool, you may use that instead with the same filled prompt.

## Workflow

### 0. Accept any of three input modes

The user can give you as little as they like — meet them where they are:

- **Brief / one-liner** — e.g. "the seagrass game loop" or "how the coral simulator works". Expand it yourself into a full storyboard using `prompt-template.md` + `style-dna.md`. The user supplies the idea; the skill supplies the style.
- **"Read the project"** — the user points you at files ("read the README", "look at this folder", "use the design doc") or just says "use the project". Read the README, design docs, scripts, and relevant code to work out what the experience does, its screens/UI, and the user journey — then continue to the shot list. Prefer real project detail over guesses; if something key is missing, ask one focused question.
- **Full prompt** — the user pastes a complete prompt or exact panel breakdown. Respect it; just apply the style and render.

**Align with the current build (existing projects).** If the experience already has generated assets (e.g. images referenced in the README) or may have changed since they were made, treat the live code as the source of truth before rendering:

- Read the README **and** check what actually changed — `git log --oneline -20` and `git diff` on the gameplay/UI code, or just open the current components — so the walkthrough reflects how the experience works *now*.
- Reconcile the shot list against the current build: drop steps that no longer exist, add new beats, and fix details that drifted (controls, mechanics, on-screen creatures/labels). Don't reproduce a stale flow.
- When replacing existing assets, render to the **same output paths** the README points to so the docs update in place.

Then proceed with digest → shot list → generate.

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

Render with the bundled script (stdlib only — reads a prompt, writes a PNG). See "Generating images (runtime)" above for the preflight. Write the filled prompt to a temp file, then:

```bash
python3 "<skill-dir>/scripts/generate.py" \
  --prompt-file <prompt.txt> \
  --aspect-ratio 16:9 \
  --out "<skill-dir>/assets/output/<experience-slug>/01-<slug>.png"
# add model options as needed, e.g. --input output_format=png
```

Model comes from `--model` or `REPLICATE_MODEL` (don't hardcode it). Pass model-specific options with repeatable `--input key=value`. Generate from the text prompt only — no reference images. Storyboards want a wide ratio (16:9 or wider).

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
