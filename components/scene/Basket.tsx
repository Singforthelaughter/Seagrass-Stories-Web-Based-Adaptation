"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { useGame } from "@/lib/store";
import type { PlacedBasket } from "@/lib/store";
import { smootherstep } from "@/lib/ease";

/**
 * An anchor basket placed on the seafloor. On spawn it scales up from nothing
 * while closed, then auto-opens by driving its "Open" morph target from 0 → 1.
 * The GLB ships no texture, so basket.png is applied as the albedo of M_basket.
 */

const MODEL = "/models/basket/basket.glb";
const TEXTURE = "/models/basket/basket.png";
const TARGET_SIZE = 1.6; // longest dimension in world units

const SCALE_DUR = 0.45; // grow-in time
const OPEN_DELAY = 0.15; // pause closed after growing
const OPEN_DUR = 1.0; // morph open time

function Basket({ pos }: { pos: PlacedBasket["pos"] }) {
  const gltf = useGLTF(MODEL);
  const tex = useTexture(TEXTURE);

  // Clone per instance so each basket has its own morph influences + transform.
  const { root, morphMesh, morphIndex } = useMemo(() => {
    const root = gltf.scene.clone(true);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.flipY = false; // glTF UV convention

    let morphMesh: THREE.Mesh | null = null;
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
      mat.map = tex;
      mat.needsUpdate = true;
      mesh.material = mat;
      if (mesh.morphTargetInfluences) morphMesh = mesh;
    });

    // Normalise size and sit the base on the seabed (y = 0).
    const box = new THREE.Box3().setFromObject(root);
    const size = new THREE.Vector3();
    box.getSize(size);
    const s = TARGET_SIZE / Math.max(size.x, size.y, size.z);
    root.scale.setScalar(s);
    box.setFromObject(root);
    const center = new THREE.Vector3();
    box.getCenter(center);
    root.position.set(-center.x, -box.min.y, -center.z);

    const dict = (morphMesh as THREE.Mesh | null)?.morphTargetDictionary;
    const morphIndex = dict?.["Open"] ?? 0;
    return { root, morphMesh: morphMesh as THREE.Mesh | null, morphIndex };
  }, [gltf, tex]);

  const outer = useRef<THREE.Group>(null!);
  const age = useRef(0);

  useFrame((_s, dt) => {
    age.current += Math.min(dt, 0.05);
    const a = age.current;
    // 1) grow in (closed)
    outer.current.scale.setScalar(smootherstep(Math.min(a / SCALE_DUR, 1)));
    // 2) open via morph once grown
    if (morphMesh) {
      const t = (a - SCALE_DUR - OPEN_DELAY) / OPEN_DUR;
      morphMesh.morphTargetInfluences![morphIndex] = smootherstep(
        Math.min(Math.max(t, 0), 1),
      );
    }
  });

  return (
    <group ref={outer} position={pos} scale={0}>
      <primitive object={root} />
    </group>
  );
}

/** Renders every placed basket. */
export function Baskets() {
  const baskets = useGame((s) => s.baskets);
  return (
    <>
      {baskets.map((b) => (
        <Basket key={b.id} pos={b.pos} />
      ))}
    </>
  );
}

useGLTF.preload(MODEL);
