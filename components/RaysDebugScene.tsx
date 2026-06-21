"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer } from "@react-three/postprocessing";
import { SunRays } from "./scene/SunRays";
import { WaterDistortion } from "./scene/WaterDistortion";
import { useGame } from "@/lib/store";

/**
 * Isolated scene for tuning the sun rays — just the rays on a plain dark
 * background, a grid for scale, and orbit controls. Lets the SunRays params be
 * adjusted (via RayTuner) and seen clearly without the rest of the game.
 */
export function RaysDebugScene() {
  const centerY = useGame((s) => s.rays.centerY);

  return (
    <Canvas camera={{ position: [0, 18, 70], fov: 46, near: 0.1, far: 500 }} gl={{ antialias: true }}>
      <color attach="background" args={["#04161f"]} />
      <ambientLight intensity={0.6} />
      {/* seafloor reference grid */}
      <gridHelper args={[220, 22, "#2a5a6a", "#16313c"]} position={[0, 0, 0]} />
      <SunRays />
      <OrbitControls target={[0, centerY * 0.6, 0]} enablePan minDistance={5} maxDistance={300} />

      {/* Diagnostic: same post-processing as /play, to see if the EffectComposer
          is what introduces the dark edge lines on the rays. */}
      <EffectComposer multisampling={2} enableNormalPass={false}>
        <WaterDistortion amplitude={0.0035} frequency={16} speed={0.8} />
      </EffectComposer>
    </Canvas>
  );
}
