# Seagrass Stories

A browser/tablet 3D multiplayer game where players are **scuba divers** who restore a shared underwater **seagrass meadow**. Drop natural-material anchor baskets, plant seagrass, and keep planting faster than the environment decays. As the meadow thrives, marine life returns. It's one shared, persistent world — whoever is online dives together (up to a cap), the world keeps living while everyone's away, and players talk only through emoji.

- **Audience:** young adults & kids
- **Platform:** web / tablet / browser (touch or mouse)
- **Stack:** Next.js + React Three Fiber (Three.js) · Supabase (Postgres + Realtime) · Vercel · realistic PBR art · AI-personalised diver textures (Replicate)

![Seagrass Stories — full player journey storyboard](skills/oceanx-storyboards/assets/output/seagrass-game/02-user-journey-8panel.png)

> Concept storyboard of the end-to-end player journey. (Concept visuals are AI-generated for design/pitch.)

---

## User Journey (storyboard steps)

Each numbered step is a beat in the player's experience, written to map directly onto a storyboard panel. Player actions are in **bold**; what the player sees/feels is in plain text.

### 1. Arrive — Splash screen
The player lands on a calm underwater title screen: "Seagrass Stories", soft light shafts, a single **Start Play** button. One clear call to action, no menus.

### 2. Personalise — Name your diver
The player **enters a username**. A 3D scuba diver slowly rotates in preview.

### 3. Personalise — Design the wetsuit with AI
The player **types a prompt** (e.g. "coral reef camo", "deep-sea bioluminescence") and **taps Generate**. An AI image becomes the diver's wetsuit **texture**, applied live on the rotating preview. The player can **regenerate** for a new look or **pick a saved texture** from their history. **Tap Confirm** to lock the look.

### 4. Descend — Enter the shared meadow
The diver drops into the underwater seagrass meadow. The player sees the current **state of the world** — some healthy patches, some bare seabed — and **other divers** already swimming nearby. A short message: "whoever's online is here with you."

### 5. Learn to move
A prompt invites the player to **tap/click the seafloor**. The diver glides to that spot; the camera follows. The player gets a feel for swimming around the meadow.

### 6. Place an anchor basket
Tutorial prompt: "Tap the seafloor to place an anchor basket." The player **taps an open patch of seabed**, a ghost preview appears, and **confirms**. A woven, natural-material **anchor basket** settles on the sand — the foundation seagrass needs to take root.

### 7. Plant seagrass
Prompt: "Tap your basket to plant seagrass." The player **taps the deployed anchor**, and young seagrass blades sprout from it.

### 8. Watch it grow
The seagrass **slowly grows** over time, swaying in the current. The player sees their patch maturing — a small, satisfying sign of progress.

### 9. Feel the pressure — keep the habitat alive
An **ecosystem-health meter** shows the meadow's condition. The environment **constantly decays**: if seagrass isn't planted faster than it dies back, the water turns murkier and the seabed pales. The player must **keep placing baskets and planting** to stay ahead of the decline.

### 10. Recovery — life returns
As enough healthy seagrass accumulates and health rises past thresholds, **marine animals return**: fish schools, a sea turtle, a seahorse, a crab. The meadow visibly comes alive — the reward for tending it.

### 11. Better together
**More divers online = more hands planting**, so the habitat is easier to sustain as a group. (No magic bonus — the help is simply other real players doing the work alongside you.)

### 12. Talk in emoji
Players **send emoji** to each other (a heart, a wave, a thumbs-up) that float above their divers. It's the only way to communicate — friendly, language-free, and safe for all ages.

### 13. Leave and return — a living world
When the player leaves, the **world keeps simulating**. Seagrass keeps growing, decay keeps pressing, animals come and go based on the meadow's health. The player can **return any time** to see how the shared meadow has changed since they were last there.

---

## Suggested storyboard shot list (8 panels)

A condensed version for a single wide storyboard strip (use the `oceanx-storyboards` skill, scuba-diver actor, line-art style):

1. **Start** — splash screen, diver taps "Start Play"
2. **Personalise** — diver + username + AI wetsuit prompt → generated texture
3. **Descend** — diver enters the meadow, other divers nearby
4. **Place** — tap seafloor → anchor basket settles on the sand
5. **Plant** — tap basket → seagrass sprouts
6. **Tend** — seagrass grows; ecosystem-health meter; decay pressure
7. **Recover** — healthy meadow, fish/turtle/seahorse return
8. **Together & away** — divers exchange emoji; world keeps living when they leave

---

## Scene shots — the experience in use

Concept photography of real players using Seagrass Stories on phone, tablet, and browser. (The scuba diver is the on-screen game **avatar** — the players themselves are not diving.)

| Personalise the diver | Place & plant |
| --- | --- |
| ![A child personalising their diver on a tablet](skills/oceanx-scene-shots/assets/output/seagrass-game/01-personalise.png) | ![A player tapping the screen to place a basket and plant seagrass](skills/oceanx-scene-shots/assets/output/seagrass-game/02-place-plant.png) |
| **Life returns** | **Playing together** |
| ![Two kids delighted as marine life returns to the meadow](skills/oceanx-scene-shots/assets/output/seagrass-game/03-life-returns.png) | ![Two friends each on their phone, greeting each other in-game with emoji](skills/oceanx-scene-shots/assets/output/seagrass-game/04-together.png) |

---

## Status & how to run

Early build. Phase 0 (scaffold + swimmable placeholder diver) is in place.

```bash
npm install
npm run dev        # → http://localhost:3000
```

See [the build plan](~/.claude/plans/) for the phased roadmap (P0 scaffold → P1 core loop → P2 persistence → P3 multiplayer → P4 AI texture → P5 PBR/animals → P6 polish). The diver and other models are placeholders until the final GLB assets are added to `public/models/`.
