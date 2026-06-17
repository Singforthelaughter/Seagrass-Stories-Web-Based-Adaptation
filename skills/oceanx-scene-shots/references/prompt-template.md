# Image Prompt Template

Generate one scene per image. Fill the variables from the project and the chosen setting/shot type. The **on-screen content block is the most important part** — it ties the photo to the real project.

To render: write the filled prompt to a file and pass it to the bundled Replicate
script. The model is the user's choice (`--model` or `$REPLICATE_MODEL`); auth via
`$REPLICATE_API_TOKEN`. Text prompt only — no reference images.

```bash
python scripts/generate.py --prompt-file prompt.txt --aspect-ratio 3:2 \
  --out assets/output/<slug>/01-<slug>-exhibition.png
# add model options as needed, e.g. --input quality=high
```

## Exhibition scene

```text
Generate one photorealistic, documentary-style photograph.

Photographic look:
Realistic editorial photography, full-frame, {35mm/50mm/85mm} lens, shallow depth of field, natural light, candid moment, cinematic but believable. Not an illustration, not a 3D render, not CGI, no plastic skin, no stock-photo posing, no fake hologram, no watermark, no added caption text.

Setting:
A dim, atmospheric museum/exhibition gallery — deep blue walls, spotlights, blurred visitors and exhibits in the background. The screen is the key light on the subjects' faces; cool blue ambient with a warm accent.

Subjects:
{e.g. three kids ~9–12 / a family / two students and an OceanX facilitator}. Authentic, varied, engaged. {Primary actor} is {touching a slider / pointing at the map / reaching toward an element}; the others {watch / lean in / hold a companion tablet}. {Facilitator wears an OceanX navy tee/polo, if present.}

Device:
{wall-mounted touchscreen kiosk (small webcam on top) / round touch table / large slightly-curved panoramic screen}{, plus a mounted companion tablet showing <secondary view>, if used}.

ON-SCREEN CONTENT (must reflect the real project):
The screen shows "{project/screen title}", a {reef scene / ocean heatmap / data dashboard / pixel-art game}. Visible UI: {main visual} with {controls — e.g. a "Water Temperature" slider, charts labelled Reef Health / Acidity / Temperature, a world map, a depth readout, an ecosystem-health bar}. {OceanX branding in a corner, if appropriate.} Keep on-screen text short and plausible.

Framing:
{Over-the-shoulder showing both subject and screen / slight wide environmental angle}, eye-level (kid-height for kids), rule-of-thirds, some negative space.

Mood:
Curious, warm, real engagement.
```

## Home scene

```text
Generate one photorealistic, documentary-style photograph.

Photographic look:
Realistic editorial photography, full-frame, {35mm/50mm} lens, shallow depth of field, soft natural daylight, candid, cozy. Not an illustration, not a 3D render, no stock-photo posing, no watermark, no added caption text.

Setting:
A cozy home — {a desk by a window / a couch / a kitchen table} — warm daylight, everyday props (mug, plant, books, backpack). Calm and lived-in.

Subject:
{one student/adult, absorbed}{, with a sibling/parent nearby, optional}. {Typing and using a mouse / holding a tablet}, genuinely focused on the screen.

Device:
{a desktop monitor / a laptop / a tablet} running the experience in {a normal browser window / an app window}. {A second window — browser or notes — beside it for realism, optional.}

ON-SCREEN CONTENT (must reflect the real project):
The screen shows "{project/screen title}", {a pixel-art ocean game with an "Ecosystem Health" bar and a "Current Depth" readout / the web simulator UI / the data tool}. Visible: {main visual + one or two real controls/labels}. Keep on-screen text short and plausible.

Framing:
Over-the-shoulder showing both the person and the screen, eye-level, rule-of-thirds.

Mood:
Quiet focus, everyday, real.
```

## Image edit prompts

Fix garbled on-screen title:

```text
Edit the provided image. On the screen, replace the garbled title text with a clean, legible "{correct title}" in a simple sans-serif, matching the screen's existing color and perspective. Keep everything else identical: people, device, lighting, framing, and the rest of the UI. Do not add any new text elsewhere.
```

De-stock a posed shot:

```text
Regenerate this photo with the same setting, cast, device, and on-screen content, but make the moment candid — natural posture and gaze toward the screen or each other, no one looking at the camera, relaxed hands mid-interaction. Keep it photorealistic with natural light and shallow depth of field.
```

Strengthen realism:

```text
Regenerate keeping the scene, but improve photographic realism: natural skin texture and tones, believable lighting from the screen and the room, soft background blur, no plastic/CGI look, no fake hologram, no oversharpening. Documentary editorial style.
```
