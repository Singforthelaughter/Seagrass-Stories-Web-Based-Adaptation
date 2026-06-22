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

// Bubble offset from the diver's head, in world units. Tune to reposition it.
const OFFSET = {
  up: 0.5, // above the head
  forward: 0.45, // in front of the face (diver's facing direction)
  side: 0, // sideways (+ = the diver's right)
};

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
    const { diverHeadPos: h, diverForward: f } = useGame.getState();
    // right vector = forward rotated -90° about Y
    group.current.position.set(
      h.x + f.x * OFFSET.forward + f.z * OFFSET.side,
      h.y + OFFSET.up,
      h.z + f.z * OFFSET.forward - f.x * OFFSET.side,
    );
  });

  // The group is always mounted (stable ref for the frame loop); only the emoji
  // is mounted on demand.
  return (
    <group ref={group}>
      {emote && (
        <Html center distanceFactor={12} zIndexRange={[20, 0]}>
          {/* key re-mounts so the pop animation replays for repeat emotes */}
          <div key={emoteAt} className="emote-pop pointer-events-none select-none">
            <div className="emote-bubble">{emote}</div>
          </div>
        </Html>
      )}
    </group>
  );
}
