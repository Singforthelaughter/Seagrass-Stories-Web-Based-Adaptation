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

## Generating images (runtime)

This skill does **not** assume a built-in image tool. It ships its own renderer: `scripts/generate.py`, which calls the Replicate HTTP API using only the Python standard library — so it runs the same way on **Claude Code** (via the Bash tool), Codex, or a local shell, with no `pip install`.

Preflight, every time before generating:

1. Confirm `REPLICATE_API_TOKEN` is set in the environment. If it's missing, tell the user to `export REPLICATE_API_TOKEN=...` (or source a `.env`) and stop — do not ask for or print the key.
2. Confirm a model is chosen — `REPLICATE_MODEL` or a `--model` value (e.g. `openai/gpt-image-2`, `google/nano-banana-pro`). If neither is set, ask the user which model to run; never hardcode one.

Run the script with the path to *this skill's* `scripts/generate.py` (resolve it relative to this SKILL.md's directory; on Claude Code that's typically `~/.claude/skills/oceanx-scene-shots/scripts/generate.py`). Save outputs under **this skill's own folder**: `assets/output/<experience-slug>/` (it's git-ignored). If a host *does* provide a built-in image tool, you may use that instead with the same filled prompt.

## Workflow

### 0. Accept any of three input modes

Meet the user where they are:

- **Brief / one-liner** — e.g. "kids using the coral simulator at a museum" or "someone playing the game at home". Expand it yourself using `prompt-template.md` + `photo-style.md`.
- **"Read the project"** — the user points you at files ("read the README", "use the design doc", "look at this folder") or says "use the project". Read the README, design docs, and relevant code to work out the experience's name, what's on screen (UI, charts, simulator, game), and how it's used — then build the scene around that real on-screen content.
- **Full prompt** — the user pastes a complete prompt; respect it and apply the photographic style.

**Align with the current build (existing projects).** If the experience already has generated shots (e.g. images referenced in the README) or may have changed since they were made, treat the live code as the source of truth before rendering:

- Read the README **and** check what actually changed — `git log --oneline -20` and `git diff` on the gameplay/UI code, or just open the current components — so the **on-screen content** matches how the experience looks *now* (real UI, controls, labels, charts, creatures).
- Reconcile each shot against the current build: update the screen depiction for anything that drifted (e.g. a joystick replacing tap-to-move, a renamed meter, different on-screen animals) and drop scenes that no longer apply.
- When replacing existing shots, render to the **same output paths** the README points to so the docs update in place.

Then proceed with digest → setting/shot → generate.

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

Render with the bundled script (stdlib only). See "Generating images (runtime)" above for the preflight. Write the filled prompt to a temp file, then:

```bash
python3 "<skill-dir>/scripts/generate.py" \
  --prompt-file <prompt.txt> \
  --aspect-ratio 3:2 \
  --out "<skill-dir>/assets/output/<experience-slug>/01-<slug>-exhibition-kiosk.png"
# add model options as needed, e.g. --input quality=high
```

Model comes from `--model` or `REPLICATE_MODEL` (don't hardcode it). Pass model-specific options with repeatable `--input key=value`. Generate from the text prompt only — no reference images. These shots read well at 3:2 or 16:9.

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
