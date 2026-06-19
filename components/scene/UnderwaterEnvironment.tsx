"use client";

import { Environment, Lightformer } from "@react-three/drei";

/**
 * Image-based lighting for the underwater scenes, generated entirely on the
 * GPU from Lightformers — no remote HDRI download, so it can't fail at runtime.
 * Gives metallic/PBR materials (tank, mask) something to reflect instead of
 * rendering pure black. Rendered once (`frames={1}`) since it's static.
 */
export function UnderwaterEnvironment() {
  return (
    <Environment resolution={256} frames={1}>
      <color attach="background" args={["#0a2a36"]} />
      {/* bright surface light from above */}
      <Lightformer intensity={3} color="#eafaff" position={[0, 6, 1]} scale={[10, 10, 1]} />
      {/* cyan side fills */}
      <Lightformer intensity={1.6} color="#7fd8e6" position={[-6, 1, 3]} scale={[6, 8, 1]} />
      <Lightformer intensity={1.6} color="#19c6c6" position={[6, 1, 3]} scale={[6, 8, 1]} />
      {/* dim deep bounce from below */}
      <Lightformer intensity={0.6} color="#063245" position={[0, -5, 0]} scale={[12, 12, 1]} />
    </Environment>
  );
}
