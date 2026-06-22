"use client";

import { create } from "zustand";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase } from "./supabaseClient";
import { useGame, type Vec3, type PlacedBasket } from "./store";

/**
 * Multiplayer sync over Supabase Realtime + Postgres.
 *
 *  - Diver pose (position + facing)  → channel BROADCAST "pose" (~12 Hz).
 *  - Emotes                          → channel BROADCAST "emote".
 *  - Suit texture + roster           → channel PRESENCE.
 *  - Anchor baskets (shared world)   → Postgres table `world_baskets` with
 *                                      realtime row changes. Environment health
 *                                      is derived from the live basket count, so
 *                                      it stays in sync automatically.
 *
 * Everything degrades gracefully: with no Supabase configured the game runs
 * single-player (baskets are added locally).
 */

const ROOM = "world";

/** A remote player's React-relevant state (low frequency: roster + identity). */
export type RemotePlayer = {
  id: string;
  texture: string | null;
  emote: string | null;
  emoteAt: number;
};

type MpState = {
  connected: boolean;
  /** Online players other than us, keyed by id. */
  players: Record<string, RemotePlayer>;
};

export const useMultiplayer = create<MpState>(() => ({
  connected: false,
  players: {},
}));

/** Latest pose target per remote player — kept OUT of React (mutated ~12 Hz and
 *  read in the render loop) so high-frequency movement never re-renders. */
export type Pose = { x: number; y: number; z: number; yaw: number };
export const remotePoses = new Map<string, Pose>();

let channel: RealtimeChannel | null = null;
let myId: string | null = null;
let localTexture: string | null = null;

function patchPlayer(id: string, patch: Partial<RemotePlayer>) {
  useMultiplayer.setState((s) => {
    const prev = s.players[id] ?? { id, texture: null, emote: null, emoteAt: 0 };
    return { players: { ...s.players, [id]: { ...prev, ...patch } } };
  });
}

/** Pull the full shared basket list and push it into the game store. */
async function loadBaskets() {
  const sb = getSupabase();
  if (!sb) return;
  const { data, error } = await sb
    .from("world_baskets")
    .select("id, player_id, x, y, z, created_at")
    .order("created_at", { ascending: true });
  if (error) {
    console.warn("Could not load baskets:", error.message);
    return;
  }
  const baskets: PlacedBasket[] = (data ?? []).map((r) => ({
    id: r.id as string,
    pos: [r.x, r.y, r.z] as Vec3,
    createdAt: Date.parse(r.created_at as string),
    playerId: r.player_id as string,
  }));
  useGame.getState().setBaskets(baskets);
}

export async function connectMultiplayer() {
  const sb = getSupabase();
  if (!sb || channel) return;
  myId = useGame.getState().playerId;
  if (!myId) return;
  localTexture = useGame.getState().suitTextureUrl;

  channel = sb.channel(`room:${ROOM}`, {
    config: { presence: { key: myId }, broadcast: { self: false } },
  });

  channel
    .on("broadcast", { event: "pose" }, ({ payload }) => {
      const p = payload as Pose & { id: string };
      if (p.id === myId) return;
      remotePoses.set(p.id, { x: p.x, y: p.y, z: p.z, yaw: p.yaw });
    })
    .on("broadcast", { event: "emote" }, ({ payload }) => {
      const { id, emote } = payload as { id: string; emote: string };
      if (id === myId) return;
      patchPlayer(id, { emote, emoteAt: Date.now() });
    })
    .on("presence", { event: "sync" }, () => {
      const state = channel!.presenceState() as Record<
        string,
        { id: string; texture: string | null }[]
      >;
      const next: Record<string, RemotePlayer> = {};
      for (const key of Object.keys(state)) {
        if (key === myId) continue;
        const meta = state[key][0];
        const prev = useMultiplayer.getState().players[key];
        next[key] = {
          id: key,
          texture: meta?.texture ?? null,
          emote: prev?.emote ?? null,
          emoteAt: prev?.emoteAt ?? 0,
        };
      }
      // forget poses for players who have left
      for (const id of [...remotePoses.keys()]) if (!next[id]) remotePoses.delete(id);
      useMultiplayer.setState({ players: next });
    })
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "world_baskets" },
      () => loadBaskets(),
    );

  channel.subscribe(async (status) => {
    if (status === "SUBSCRIBED") {
      useMultiplayer.setState({ connected: true });
      await channel!.track({ id: myId, texture: localTexture });
      await loadBaskets();
    }
  });
}

export function disconnectMultiplayer() {
  const sb = getSupabase();
  if (channel && sb) sb.removeChannel(channel);
  channel = null;
  remotePoses.clear();
  useMultiplayer.setState({ connected: false, players: {} });
}

/** True once the realtime channel is live. */
export function isConnected() {
  return useMultiplayer.getState().connected;
}

// ── outbound (local player → others) ──────────────────────────────────────

export function broadcastPose(x: number, y: number, z: number, yaw: number) {
  if (!channel || !useMultiplayer.getState().connected) return;
  channel.send({ type: "broadcast", event: "pose", payload: { id: myId, x, y, z, yaw } });
}

export function broadcastEmote(emote: string) {
  if (!channel || !useMultiplayer.getState().connected) return;
  channel.send({ type: "broadcast", event: "emote", payload: { id: myId, emote } });
}

export async function setLocalTexture(texture: string | null) {
  localTexture = texture;
  if (channel && useMultiplayer.getState().connected) {
    await channel.track({ id: myId, texture });
  }
}

// ── baskets (shared world) ────────────────────────────────────────────────

/** Place a basket: gate on the local batch budget, then write to the shared
 *  world (DB when connected, otherwise add locally). */
export async function placeBasket(pos: Vec3) {
  if (!useGame.getState().tryConsumeBasket()) return;
  const sb = getSupabase();
  if (channel && sb && myId) {
    const { error } = await sb
      .from("world_baskets")
      .insert({ player_id: myId, x: pos[0], y: pos[1], z: pos[2] });
    if (error) console.warn("Basket insert failed:", error.message);
    // it appears for everyone (incl. us) via the realtime row change
  } else {
    useGame.getState().addLocalBasket(pos);
  }
}

/** Remove a basket at end of life (owner only). */
export async function removeBasket(id: string) {
  const sb = getSupabase();
  if (channel && sb) {
    await sb.from("world_baskets").delete().eq("id", id);
  } else {
    useGame.getState().removeBasket(id);
  }
}
