"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { useGame } from "@/lib/store";

/**
 * Shows the player's selected emoji floating above their diver. Follows the
 * diver each frame and auto-clears a few seconds after it's triggered.
 */

const EMOTE_DURATION = 3000; // ms the emote stays up
const HEIGHT = 2.2; // world units above the diver

export function EmoteBubble() {
  const group = useRef<THREE.Group>(null!);
  const emote = useGame((s) => s.emote);
  const emoteAt = useGame((s) => s.emoteAt);
  const setEmote = useGame((s) => s.setEmote);

  // auto-clear after the duration (re-armed each time a new emote is picked)
  useEffect(() => {
    if (!emote) return;
    const t = setTimeout(() => setEmote(null), EMOTE_DURATION);
    return () => clearTimeout(t);
  }, [emote, emoteAt, setEmote]);

  useFrame(() => {
    if (!group.current) return;
    const d = useGame.getState().diverPos;
    group.current.position.set(d.x, d.y + HEIGHT, d.z);
  });

  // The group is always mounted (stable ref for the frame loop); only the emoji
  // is mounted on demand.
  return (
    <group ref={group}>
      {emote && (
        <Html center distanceFactor={12} zIndexRange={[20, 0]}>
          {/* key re-mounts so the pop animation replays for repeat emotes */}
          <div
            key={emoteAt}
            className="emote-pop pointer-events-none select-none text-5xl drop-shadow-lg"
          >
            {emote}
          </div>
        </Html>
      )}
    </group>
  );
}
