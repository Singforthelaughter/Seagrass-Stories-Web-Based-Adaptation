"use client";

import { Suspense, useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGame } from "@/lib/store";
import {
  useMultiplayer,
  connectMultiplayer,
  disconnectMultiplayer,
  broadcastPose,
  broadcastEmote,
  setLocalTexture,
} from "@/lib/multiplayer";
import { RemoteDiver } from "./RemoteDiver";

const POSE_INTERVAL = 0.08; // seconds between pose broadcasts (~12 Hz)

/**
 * Drives multiplayer: connects the realtime channel, broadcasts the local
 * diver's pose / emote / texture, and renders every other player's diver.
 */
export function RemotePlayers() {
  const playerId = useGame((s) => s.playerId);
  const players = useMultiplayer((s) => s.players);
  const acc = useRef(0);

  // Connect once we have a stable player id; disconnect on unmount.
  useEffect(() => {
    if (!playerId) return;
    connectMultiplayer();
    return () => disconnectMultiplayer();
  }, [playerId]);

  // Mirror local suit texture + emotes onto the channel.
  useEffect(() => {
    return useGame.subscribe((s, prev) => {
      if (s.suitTextureUrl !== prev.suitTextureUrl) setLocalTexture(s.suitTextureUrl);
      if (s.emote && s.emote !== prev.emote) broadcastEmote(s.emote);
    });
  }, []);

  // Broadcast our pose (position + facing yaw) while playing.
  useFrame((_s, dt) => {
    const g = useGame.getState();
    if (g.phase !== "playing") return;
    acc.current += dt;
    if (acc.current < POSE_INTERVAL) return;
    acc.current = 0;
    const p = g.diverPos;
    const f = g.diverForward;
    broadcastPose(p.x, p.y, p.z, Math.atan2(f.x, f.z));
  });

  return (
    <Suspense fallback={null}>
      {Object.values(players).map((pl) => (
        <RemoteDiver
          key={pl.id}
          id={pl.id}
          texture={pl.texture}
          emote={pl.emote}
          emoteAt={pl.emoteAt}
        />
      ))}
    </Suspense>
  );
}
