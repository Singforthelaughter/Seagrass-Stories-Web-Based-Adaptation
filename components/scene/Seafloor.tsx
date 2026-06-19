"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useGame } from "@/lib/store";

/**
 * The sandy seafloor. Tapping/clicking it sets the diver's swim target.
 * (P1 will layer placement of anchor baskets on top of this.)
 */
export function Seafloor() {
  const setDiverTarget = useGame((s) => s.setDiverTarget);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    // Only swim once we're actually playing — during personalise the floor is
    // out of frame and OrbitControls owns the gestures.
    if (useGame.getState().phase !== "playing") return;
    e.stopPropagation();
    setDiverTarget([e.point.x, 0, e.point.z]);
  };

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      receiveShadow
      onPointerDown={handlePointerDown}
    >
      <planeGeometry args={[200, 200, 1, 1]} />
      <meshStandardMaterial color="#c2a878" roughness={1} metalness={0} />
    </mesh>
  );
}
