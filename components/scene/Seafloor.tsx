"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { smootherstep } from "@/lib/ease";

/**
 * The sandy seafloor. Hidden (scale 0) during personalise, then grows in on
 * the same eased timeline as the dive-in transition. Movement is driven by the
 * on-screen joystick; later phases layer tap-to-place (anchor baskets) on top.
 */
export function Seafloor({ progress }: { progress: React.RefObject<number> }) {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame(() => {
    const e = smootherstep(progress.current);
    ref.current.visible = e > 0.001;
    ref.current.scale.setScalar(Math.max(e, 1e-4));
  });

  return (
    <mesh
      ref={ref}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      scale={0}
      visible={false}
      receiveShadow
    >
      <planeGeometry args={[200, 200, 1, 1]} />
      <meshStandardMaterial color="#c2a878" roughness={1} metalness={0} />
    </mesh>
  );
}
