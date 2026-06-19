"use client";

import { Suspense, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "@/lib/store";
import { Diver } from "./Diver";

const SWIM_HEIGHT = 1.3; // diver floats above the seafloor
const _dir = new THREE.Vector3();
const _camGoal = new THREE.Vector3();
const _target = new THREE.Vector3(0, SWIM_HEIGHT, 0);

/**
 * The local player's scuba diver — PLACEHOLDER geometry for P0.
 * Swap this group for the user-provided rigged diver GLB in P4/P5
 * (keep a dedicated "wetsuit" material so the AI texture can map onto it).
 */
export function Player() {
  const group = useRef<THREE.Group>(null!);
  const { camera } = useThree();

  useFrame((_, dtRaw) => {
    const g = group.current;
    if (!g) return;
    const dt = Math.min(dtRaw, 0.05); // clamp for tab-switch hitches

    const tgt = useGame.getState().diverTarget;
    if (tgt) _target.set(tgt[0], SWIM_HEIGHT, tgt[2]);

    // glide toward the tapped point
    g.position.lerp(_target, 1 - Math.pow(0.001, dt));

    // face the direction of travel
    _dir.copy(_target).sub(g.position);
    if (_dir.lengthSq() > 4e-4) {
      const yaw = Math.atan2(_dir.x, _dir.z);
      g.rotation.y = THREE.MathUtils.damp(g.rotation.y, yaw, 6, dt);
    }

    // gentle bob
    g.position.y = SWIM_HEIGHT + Math.sin(performance.now() * 0.0015) * 0.08;

    // follow camera
    _camGoal.set(g.position.x, g.position.y + 6, g.position.z + 11);
    camera.position.lerp(_camGoal, 1 - Math.pow(0.0015, dt));
    camera.lookAt(g.position.x, g.position.y, g.position.z);
  });

  return (
    <group ref={group} position={[0, SWIM_HEIGHT, 0]}>
      <Suspense fallback={null}>
        <Diver />
      </Suspense>
    </group>
  );
}
