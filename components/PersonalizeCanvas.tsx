"use client";

import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Diver } from "./scene/Diver";
import { UnderwaterEnvironment } from "./scene/UnderwaterEnvironment";

const WATER_TOP = "#0e5a72";

/** Diver floating in open water (no seafloor), gently turning + bobbing. */
function FloatingDiver() {
  const group = useRef<THREE.Group>(null!);
  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    g.rotation.y = t * 0.4; // slow turntable
    g.position.y = Math.sin(t * 0.8) * 0.12; // gentle bob
  });

  return (
    <group ref={group}>
      <Diver targetLength={2.6} />
    </group>
  );
}

export function PersonalizeCanvas() {
  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ position: [0, 0.2, 4], fov: 42, near: 0.1, far: 100 }}
      gl={{ antialias: true }}
    >
      {/* open mid-water: deep blue, fades to dark — no seafloor */}
      <color attach="background" args={[WATER_TOP]} />
      <fog attach="fog" args={[WATER_TOP, 6, 16]} />

      <ambientLight intensity={0.8} color="#bfeaf4" />
      <hemisphereLight args={["#cdeefa", "#062430", 1.0]} />
      <directionalLight position={[3, 6, 4]} intensity={1.6} color="#eafaff" />

      <Suspense fallback={null}>
        {/* image-based lighting so the wetsuit/metal read as PBR, not black */}
        <UnderwaterEnvironment />
        <FloatingDiver />
      </Suspense>
    </Canvas>
  );
}
