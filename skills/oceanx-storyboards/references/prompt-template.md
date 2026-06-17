# Image Prompt Template

Generate each storyboard as its own image. Fill the variables from the experience; don't pack unrelated storyboards into one render.

To render: write the filled prompt to a file and pass it to the bundled Replicate
script. The model is the user's choice (`--model` or `$REPLICATE_MODEL`); auth via
`$REPLICATE_API_TOKEN`. Text prompt only — no reference images.

```bash
python3 scripts/generate.py --prompt-file prompt.txt --aspect-ratio 16:9 \
  --out assets/output/<slug>/01-<slug>.png
# add model options as needed, e.g. --input output_format=png
```

## Numbered step strip (default)

```text
Generate one wide horizontal process-storyboard illustration.

Visual DNA:
Clean white background. Minimalist black line-art. Thin even lines. Lots of white space. A calm, friendly science-museum / product-explainer feeling, slightly techy. No photorealism, no 3D render, no rendered lighting, no detailed faces, no flat full-color stock-vector style, no cute mascot, no literal pixel-perfect UI mockup, no drop shadows, no textured background, no dense text.

Layout:
A single wide strip of {N} numbered panels, left to right, on white. Each panel has a filled dark-navy circle with a white numeral (1..{N}) at its top-left, followed by a bold navy step title. Chunky teal/cyan block arrows point from each panel to the next.

Recurring actor required:
A minimalist black stick-figure person (round open head, thin line limbs, no face detail, no clothing detail) performs the core action in every panel — placing, pointing, holding a tablet, reaching toward the screen, reacting. The figure IS the action, not decoration.

Panels:
1. {title} — {actor action + key prop/screen}
2. {title} — {actor action + key prop/screen}
3. {title} — {actor action + key prop/screen}
{...up to N}

Color use:
Navy for step circles, titles, frames, and main structure. Teal/cyan for the arrows and active highlights. Soft light-blue washes only for screens, water, AR projection, and digital fields. A warm yellow/orange accent on at most one or two tiny elements (a fish, a highlight). Stick figures stay black line-art, no color fill.

On-image labels (short):
{label1} / {label2} / {label3} (keep to a few words each)

Constraints:
One coherent left-to-right journey. Keep generous whitespace; subjects don't fill the panels. Numbered circles must be present and in order. Arrows must be teal. Background must be clean white. Clear in a few seconds, friendly, not childish, not photoreal, not a UI screenshot.
```

## Single exhibit scene

```text
Generate one wide horizontal explainer illustration.

Visual DNA: clean white background, minimalist black line-art, thin even lines, lots of white space, calm museum-exhibit feeling, slightly techy. No photorealism, no 3D, no detailed faces, no stock-vector flat style, no cute mascot, no UI mockup, no shadows or textures.

Scene:
{describe the one big interactive moment — a large curved light-blue screen / AR tank / kiosk wall}. A minimalist black stick-figure person stands in front, {pointing / reaching / observing}. Sparse line-art sea life ({creatures}) on the screen surface. Soft light-blue wash for the screen/AR volume.

Color use: navy for structure and any title, teal for highlights, light-blue for the screen/water, one small warm accent. Figure stays line-art.

Constraints: a single calm scene, lots of whitespace, a few short labels at most, clean white background, not photoreal, not a UI screenshot.
```

## Image edit prompts

Remove a stray title/label:

```text
Edit the provided image. Remove only the text "{text to remove}" and any underline beneath it. Fill that area with the same clean white background to match the surrounding paper. Preserve everything else exactly: stick figures, numbered circles, arrows, labels, line style, layout, and aspect ratio. Do not add any new text or objects.
```

Make the figure carry the action:

```text
Regenerate this storyboard with the same steps, layout, and palette, but make the stick-figure actor central to each step's action — placing, pointing, reaching, reacting — rather than standing beside the scene. Keep it clean line-art, white background, navy numbered circles, teal arrows, light-blue washes, and lots of whitespace.
```

Fix palette drift:

```text
Regenerate keeping the same composition, but restrain the palette: white background, black line-art figures and icons, navy for numbered circles/titles/structure, teal only for arrows and highlights, soft light-blue only for screens/water/AR, and a warm accent on at most one or two tiny elements. Remove any full-color fills, gradients-as-background, or shadows.
```
