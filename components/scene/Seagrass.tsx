"use client";

import { useMemo } from "react";
import { Clone, useGLTF } from "@react-three/drei";
import * as THREE from "three";

/**
 * The seagrass meadow. Two authored variants (SM_SeaGrass_01 / _02) are mixed
 * randomly across the field for variety. It is rendered as a child of the
 * seafloor's scaling group, so it grows in together with the floor on dive-in.
 *
 * Each variant is normalised to a target height so the two models read at a
 * consistent size regardless of their authored scale.
 */

const MODELS = [
  "/models/seagrass/seagrass0.glb",
  "/models/seagrass/seagrass1.glb",
] as const;

const TARGET_HEIGHT = 1.6; // world units, tallest blade ~ this
const FIELD_BOUND = 88; // spread (just inside the diver's SWIM_BOUND of 90)
const COUNT = 110; // number of clumps (simple meshes; instanced in P5)

type Blade = {
  variant: 0 | 1;
  x: number;
  z: number;
  rotY: number;
  scale: number;
};

export function SeagrassField() {
  const gltf0 = useGLTF(MODELS[0]);
  const gltf1 = useGLTF(MODELS[1]);

  // Per-variant uniform scale that normalises authored size to TARGET_HEIGHT.
  const baseScale = useMemo(() => {
    return [gltf0.scene, gltf1.scene].map((scene) => {
      const box = new THREE.Box3().setFromObject(scene);
      const size = new THREE.Vector3();
      box.getSize(size);
      const h = Math.max(size.y, 1e-4);
      return TARGET_HEIGHT / h;
    });
  }, [gltf0.scene, gltf1.scene]);

  // Deterministic-ish random scatter, generated once.
  const blades = useMemo<Blade[]>(() => {
    const rand = (a: number, b: number) => a + Math.random() * (b - a);
    return Array.from({ length: COUNT }, () => ({
      variant: (Math.random() < 0.5 ? 0 : 1) as 0 | 1,
      x: rand(-FIELD_BOUND, FIELD_BOUND),
      z: rand(-FIELD_BOUND, FIELD_BOUND),
      rotY: rand(0, Math.PI * 2),
      scale: rand(0.75, 1.4),
    }));
  }, []);

  const scenes = [gltf0.scene, gltf1.scene];

  return (
    <group>
      {blades.map((b, i) => (
        <Clone
          key={i}
          object={scenes[b.variant]}
          position={[b.x, 0, b.z]}
          rotation={[0, b.rotY, 0]}
          scale={baseScale[b.variant] * b.scale}
          castShadow
          receiveShadow
        />
      ))}
    </group>
  );
}

useGLTF.preload(MODELS[0]);
useGLTF.preload(MODELS[1]);
