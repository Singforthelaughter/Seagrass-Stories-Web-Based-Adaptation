"use client";

import { getSupabase } from "./supabaseClient";
import { useGame } from "./store";

/**
 * Player session helpers (browser). Everything degrades gracefully: if Supabase
 * isn't configured the game still runs with an in-memory texture history.
 *
 * Auth is anonymous (Supabase → Authentication → Anonymous), so there is no
 * login screen — each device gets a stable anon uid that owns its `players`
 * row and `diver_textures` history under RLS.
 */

/** Sign in anonymously if needed and make sure a `players` row exists. */
export async function ensureSession() {
  const sb = getSupabase();
  if (!sb) return null;

  let {
    data: { session },
  } = await sb.auth.getSession();

  if (!session) {
    const { data, error } = await sb.auth.signInAnonymously();
    if (error) {
      console.warn("Anonymous sign-in failed:", error.message);
      return null;
    }
    session = data.session;
  }

  const user = session?.user;
  if (user) {
    // user.id is the stable, unique player id used throughout the app.
    useGame.getState().setPlayerId(user.id);
    await sb
      .from("players")
      .upsert({ id: user.id, last_seen: new Date().toISOString() }, { onConflict: "id" });
  }
  return session;
}

/** The current access token, forwarded to the API route so it can attribute saves. */
export async function getAccessToken(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const {
    data: { session },
  } = await sb.auth.getSession();
  return session?.access_token ?? null;
}

/** Load this player's saved wetsuit textures (most recent first). */
export async function loadTextureHistory(): Promise<string[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("diver_textures")
    .select("public_url")
    .order("created_at", { ascending: false })
    .limit(24);
  if (error) {
    console.warn("Could not load texture history:", error.message);
    return [];
  }
  return (data ?? []).map((r) => r.public_url as string);
}
