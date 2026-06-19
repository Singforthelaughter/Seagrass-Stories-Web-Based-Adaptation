import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServiceSupabase } from "@/lib/supabaseServer";

// Image generation can take 10–40s; give the function room.
export const runtime = "nodejs";
export const maxDuration = 60;

const API = "https://api.replicate.com/v1";
const DEFAULT_MODEL = "google/nano-banana-2";
// Text model that expands the player's short idea into a rich texture prompt.
const ENHANCER_MODEL = "google/gemini-2.5-flash";

// The diver's wetsuit UV is one continuous full-body unwrap (torso, arms, legs),
// so we want a flat, evenly-distributed, seamless material — not a body-shaped
// graphic with a focal point. This guides the rewrite toward exactly that.
const ENHANCER_SYSTEM =
  "You rewrite a short user idea into ONE vivid, detailed prompt for an AI image " +
  "generator that will produce a SEAMLESS, TILEABLE flat material texture for a " +
  "full-body scuba diving wetsuit (the texture wraps the entire suit: torso, arms " +
  "and legs as one continuous unwrap). Rules: describe colors, patterns, surface " +
  "finish and neoprene fabric detail; keep the pattern continuous and evenly " +
  "distributed with NO focal point, NO seams, NO logos or text, NO body shapes, " +
  "NO shadows, flat lay, evenly lit, photographic. Output ONLY the final prompt as " +
  "a single sentence, max 60 words, no preamble.";

/** Verify the forwarded anon access token and return the player's uid. */
async function getUserId(req: Request): Promise<string | null> {
  const header = req.headers.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !anon) return null;
  const sb = createClient(url, anon, { auth: { persistSession: false } });
  const { data, error } = await sb.auth.getUser(token);
  if (error) return null;
  return data.user?.id ?? null;
}

/**
 * Persist the generated image to Supabase Storage (bytes, not the temporary
 * Replicate URL) and record a `diver_textures` row. Returns the durable public
 * URL, or null if Supabase isn't configured / the player isn't authed — the
 * caller falls back to the inline data URL so generation still works.
 */
async function persistTexture(
  userId: string,
  prompt: string,
  buf: Buffer,
  contentType: string,
): Promise<string | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    const svc = getServiceSupabase();
    const ext = contentType.includes("png")
      ? "png"
      : contentType.includes("webp")
        ? "webp"
        : "jpg";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const up = await svc.storage
      .from("diver-textures")
      .upload(path, buf, { contentType, upsert: false });
    if (up.error) {
      console.warn("Storage upload failed:", up.error.message);
      return null;
    }
    const publicUrl = svc.storage.from("diver-textures").getPublicUrl(path).data.publicUrl;
    const ins = await svc
      .from("diver_textures")
      .insert({ player_id: userId, prompt, storage_path: path, public_url: publicUrl });
    if (ins.error) console.warn("diver_textures insert failed:", ins.error.message);
    return publicUrl;
  } catch (e) {
    console.warn("persistTexture failed:", e);
    return null;
  }
}

type Prediction = {
  status?: string;
  output?: unknown;
  error?: unknown;
  urls?: { get?: string };
};

/** Replicate image output can be a URL string, a list, or {url} objects. */
function firstUrl(output: unknown): string | null {
  if (typeof output === "string") return output;
  if (Array.isArray(output)) {
    for (const o of output) {
      const u = firstUrl(o);
      if (u) return u;
    }
    return null;
  }
  if (output && typeof output === "object" && "url" in output) {
    const u = (output as { url?: unknown }).url;
    return typeof u === "string" ? u : null;
  }
  return null;
}

async function call(url: string, token: string, init?: RequestInit) {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Token ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Replicate ${res.status}: ${detail}`);
  }
  return (await res.json()) as Prediction;
}

/**
 * Expand the player's short idea into a detailed, seamless full-body-wetsuit
 * prompt via gemini-2.5-flash. Best-effort: returns null (so the caller falls
 * back to the simple template) if the model errors or is too slow.
 */
async function enhancePrompt(idea: string, token: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20_000);
    const res = await fetch(`${API}/models/${ENHANCER_MODEL}/predictions`, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
        Prefer: "wait",
      },
      body: JSON.stringify({
        input: {
          prompt: idea,
          system_instruction: ENHANCER_SYSTEM,
          temperature: 0.9,
          max_output_tokens: 2000,
        },
      }),
    }).finally(() => clearTimeout(timer));
    if (!res.ok) return null;
    const pred = (await res.json()) as Prediction;
    if (pred.status !== "succeeded") return null;
    // gemini's output is an array of streamed string chunks.
    const out = Array.isArray(pred.output) ? pred.output.join("") : pred.output;
    const text = typeof out === "string" ? out.trim() : "";
    return text.length > 10 ? text.slice(0, 600) : null;
  } catch {
    return null; // timeout / network — fall back to the template
  }
}

export async function POST(req: Request) {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    return NextResponse.json(
      { error: "Texture generation is not configured (missing REPLICATE_API_TOKEN)." },
      { status: 503 },
    );
  }

  let prompt = "";
  try {
    ({ prompt } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  prompt = (prompt ?? "").toString().trim().slice(0, 300);
  if (!prompt) {
    return NextResponse.json({ error: "Please enter a prompt." }, { status: 400 });
  }

  // Expand the short idea into a richer, UV-aware texture prompt; if that fails
  // or is slow, fall back to a simple template so generation still works.
  const enhanced = await enhancePrompt(prompt, token);
  const fullPrompt =
    enhanced ??
    `Seamless, tileable material texture for a scuba-diving wetsuit: ${prompt}. ` +
      `Flat lay, evenly lit, sharp high detail, no seams, no logos or text, ` +
      `no shadows, photographic neoprene fabric surface.`;
  const model = process.env.REPLICATE_MODEL || DEFAULT_MODEL;

  try {
    // `Prefer: wait` blocks up to ~60s so we usually get the result inline.
    let pred = await call(`${API}/models/${model}/predictions`, token, {
      method: "POST",
      headers: { Prefer: "wait" },
      body: JSON.stringify({
        input: { prompt: fullPrompt, aspect_ratio: "1:1", resolution: "1K" },
      }),
    });

    // Poll if it didn't finish within the wait window.
    const deadline = Date.now() + 45_000;
    while (pred.status && !["succeeded", "failed", "canceled"].includes(pred.status)) {
      if (Date.now() > deadline || !pred.urls?.get) break;
      await new Promise((r) => setTimeout(r, 2000));
      pred = await call(pred.urls.get, token);
    }

    if (pred.status !== "succeeded") {
      const msg = typeof pred.error === "string" ? pred.error : "Generation failed.";
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    const imageUrl = firstUrl(pred.output);
    if (!imageUrl) {
      return NextResponse.json({ error: "No image was returned." }, { status: 502 });
    }

    // Fetch the bytes server-side: a data URL gives the browser an instant,
    // CORS-safe preview, while the same bytes are uploaded to Supabase Storage
    // for a durable URL (Replicate delivery URLs expire).
    const img = await fetch(imageUrl);
    if (!img.ok) {
      return NextResponse.json({ error: "Could not download the image." }, { status: 502 });
    }
    const contentType = img.headers.get("content-type") || "image/jpeg";
    const buf = Buffer.from(await img.arrayBuffer());
    const dataUrl = `data:${contentType};base64,${buf.toString("base64")}`;

    // Persist for this player's history (best-effort; never blocks the result).
    const userId = await getUserId(req);
    const url = userId ? await persistTexture(userId, prompt, buf, contentType) : null;

    return NextResponse.json({ image: dataUrl, url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
