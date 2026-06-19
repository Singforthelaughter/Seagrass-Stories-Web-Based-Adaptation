import { NextResponse } from "next/server";

// Image generation can take 10–40s; give the function room.
export const runtime = "nodejs";
export const maxDuration = 60;

const API = "https://api.replicate.com/v1";
const DEFAULT_MODEL = "google/nano-banana-pro";

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

  // Shape the request toward a clean, tileable wetsuit material.
  const fullPrompt =
    `Seamless, tileable material texture for a scuba-diving wetsuit: ${prompt}. ` +
    `Flat lay, evenly lit, sharp high detail, no seams, no logos or text, ` +
    `no shadows, photographic neoprene fabric surface.`;
  const model = process.env.REPLICATE_MODEL || DEFAULT_MODEL;

  try {
    // `Prefer: wait` blocks up to ~60s so we usually get the result inline.
    let pred = await call(`${API}/models/${model}/predictions`, token, {
      method: "POST",
      headers: { Prefer: "wait" },
      body: JSON.stringify({ input: { prompt: fullPrompt, aspect_ratio: "1:1" } }),
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

    // Fetch the bytes server-side and return a data URL so the browser can use
    // it as a WebGL texture without cross-origin tainting. (Persisting to
    // Supabase Storage comes with P2/P4 persistence.)
    const img = await fetch(imageUrl);
    if (!img.ok) {
      return NextResponse.json({ error: "Could not download the image." }, { status: 502 });
    }
    const contentType = img.headers.get("content-type") || "image/jpeg";
    const buf = Buffer.from(await img.arrayBuffer());
    const dataUrl = `data:${contentType};base64,${buf.toString("base64")}`;

    return NextResponse.json({ image: dataUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
