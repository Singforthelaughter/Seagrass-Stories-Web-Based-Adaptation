#!/usr/bin/env node
// Generate a cover / thumbnail image for Seagrass Stories using the same
// Replicate image model the game already uses for wetsuit textures.
//
// Usage:
//   node .claude/skills/game-cover/generate-cover.mjs "<prompt>" [--aspect 16:9] [--out public/cover.png]
//
// Reads REPLICATE_API_TOKEN (and optional REPLICATE_MODEL) from the environment,
// falling back to the project's .env / .env.local file. Never prints the token.

import { writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const API = "https://api.replicate.com/v1";
// Cover art uses Nano Banana Pro for higher-fidelity key art. This is its own
// default (NOT the game's REPLICATE_MODEL, which is tuned for flat textures);
// override per-run with --model if needed.
const DEFAULT_MODEL = "google/nano-banana-pro";

// ── load token from .env files if not already in the environment ────────────
function loadEnvFile(file) {
  if (!existsSync(file)) return;
  try {
    process.loadEnvFile(file); // Node 20.12+/21+ : populates process.env
  } catch {
    /* ignore */
  }
}
if (!process.env.REPLICATE_API_TOKEN) {
  loadEnvFile(".env.local");
  loadEnvFile(".env");
}

const token = process.env.REPLICATE_API_TOKEN;
if (!token) {
  console.error("Missing REPLICATE_API_TOKEN (set it in the environment or .env).");
  process.exit(1);
}
// ── args ────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
function flag(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}
const aspect = flag("aspect", "16:9");
const out = flag("out", "public/cover.png");
const model = flag("model", DEFAULT_MODEL);
const idea = args.filter((a, i) => !a.startsWith("--") && args[i - 1]?.startsWith("--") !== true)[0];

// The game's identity, baked in so a one-line idea still yields an on-brand cover.
const STYLE =
  "Vibrant, painterly game cover key art for 'Seagrass Stories', a friendly " +
  "underwater game where scuba divers restore a seagrass meadow. Sunlit " +
  "turquoise tropical ocean, light rays through clear water, lush green " +
  "seagrass, gentle sea creatures (turtle, dugong, fish). Bright, hopeful, " +
  "polished mobile-game art, strong focal composition, rich color, soft depth. " +
  // Hero diver with a distinctive custom wetsuit so the player character reads
  // as 'theirs', shown performing the game's core action: planting baskets.
  "Hero character: a cute scuba diver in a custom-designed wetsuit — sleek " +
  "teal-and-emerald neoprene with glowing bioluminescent seagrass-leaf " +
  "patterns flowing down the arms and legs, coral-orange trim accents, a " +
  "polished dive mask and fins. The diver is kneeling at the seabed, reaching " +
  "down to place a woven anchor basket onto the sand, and fresh green seagrass " +
  "is sprouting and growing up out of the basket — clearly showing the act of " +
  "planting baskets to restore the meadow. A few more baskets with seagrass " +
  "dot the seabed around them. " +
  // Title text rendered into the art.
  "Render the large game title text 'SEAGRASS STORIES' prominently at the top " +
  "as a bold, playful, clean logo, clearly legible, integrated into the art " +
  "and spelled exactly. No watermark, no UI, no extra text besides the title.";

const prompt = idea ? `${STYLE} Emphasis: ${idea}.` : STYLE;

async function call(url, init) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`Replicate ${res.status}: ${await res.text()}`);
  return res.json();
}

function firstUrl(output) {
  if (typeof output === "string") return output;
  if (Array.isArray(output)) {
    for (const o of output) {
      const u = firstUrl(o);
      if (u) return u;
    }
    return null;
  }
  if (output && typeof output === "object" && "url" in output)
    return typeof output.url === "string" ? output.url : null;
  return null;
}

console.log(`Generating cover (${aspect}) with ${model}…`);

let pred = await call(`${API}/models/${model}/predictions`, {
  method: "POST",
  headers: { Prefer: "wait" }, // block up to ~60s so we usually get it inline
  body: JSON.stringify({ input: { prompt, aspect_ratio: aspect, resolution: "2K" } }),
});

const deadline = Date.now() + 90_000;
while (pred.status && !["succeeded", "failed", "canceled"].includes(pred.status)) {
  if (Date.now() > deadline || !pred.urls?.get) break;
  await new Promise((r) => setTimeout(r, 2500));
  pred = await call(pred.urls.get);
}
if (pred.status !== "succeeded") {
  console.error("Generation failed:", pred.error || pred.status);
  process.exit(1);
}

const imageUrl = firstUrl(pred.output);
if (!imageUrl) {
  console.error("No image URL was returned.");
  process.exit(1);
}

const img = await fetch(imageUrl);
if (!img.ok) {
  console.error("Could not download the generated image.");
  process.exit(1);
}
const buf = Buffer.from(await img.arrayBuffer());
const outPath = path.resolve(out);
await writeFile(outPath, buf);
console.log(`Saved cover → ${out} (${(buf.length / 1024).toFixed(0)} KB)`);
