"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Seafloor } from "./scene/Seafloor";
import { Player } from "./scene/Player";
import { UnderwaterEnvironment } from "./scene/UnderwaterEnvironment";

const WATER_COLOR = "#0b3547";

export function GameCanvas() {
  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ position: [0, 7, 12], fov: 50, near: 0.1, far: 200 }}
      gl={{ antialias: true }}
    >
      {/* underwater backdrop + depth fog (P5 will make this PBR/volumetric) */}
      <color attach="background" args={[WATER_COLOR]} />
      <fog attach="fog" args={[WATER_COLOR, 12, 55]} />

      <ambientLight intensity={0.6} color="#9fd8e6" />
      <hemisphereLight args={["#bdeaf6", "#0a2a36", 0.7]} />
      <directionalLight
        position={[6, 18, 8]}
        intensity={1.1}
        color="#dff4ff"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />

      <Suspense fallback={null}>
        {/* IBL so PBR/metal materials read correctly instead of black */}
        <UnderwaterEnvironment />
        <Seafloor />
        <Player />
      </Suspense>
    </Canvas>
  );
}
