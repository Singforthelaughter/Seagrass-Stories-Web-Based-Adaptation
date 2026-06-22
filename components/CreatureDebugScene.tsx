"use client";

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useFBX, useTexture, useAnimations } from "@react-three/drei";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";
import { buildFishGeometry, FishSchool } from "./scene/FishSchool";
import { AnimatedCreatures } from "./scene/AnimatedCreatures";
import { JUVENILE_FISH, SCAD_FISH, TURTLE, DUGONG } from "./scene/creatures";
import type { FishModel, CreatureModel } from "./scene/creatures";
import { TURTLE_COUNT, DUGONG_COUNT } from "@/lib/gameConfig";

export type DebugMode = "static" | "motion";

/**
 * Standalone debug view for a single creature: renders it at the origin facing
 * the +Z arrow so its orientation/scale can be dialled in. The values map 1:1
 * onto creatures.ts (fish: targetLen/flip/upright; turtle/dugong:
 * targetSize/upright, with yawOffset = 0 once the nose points along +Z).
 */

export type CreatureKey = "juvenile" | "scad" | "turtle" | "dugong";

export type DebugParams = {
  rx: number; // rotation, radians
  ry: number;
  rz: number;
  size: number; // targetLen (fish) or targetSize (creature)
  flip: boolean; // fish only
};

const FISH: Record<"juvenile" | "scad", FishModel> = {
  juvenile: JUVENILE_FISH,
  scad: SCAD_FISH,
};
const CREATURES: Record<"turtle" | "dugong", CreatureModel> = {
  turtle: TURTLE,
  dugong: DUGONG,
};

/** A single fish, built with the exact production geometry pipeline, facing +Z. */
function DebugFish({ model, p }: { model: FishModel; p: DebugParams }) {
  const fbx = useFBX(model.fbx);
  const [map, normal] = useTexture([model.map, model.normal]);
  const { geometry, material } = useMemo(() => {
    map.colorSpace = THREE.SRGBColorSpace;
    normal.colorSpace = THREE.NoColorSpace;
    const material = new THREE.MeshStandardMaterial({
      map,
      normalMap: normal,
      roughness: 0.7,
      metalness: 0,
      side: THREE.DoubleSide,
    });
    const geometry = buildFishGeometry(fbx, p.size, p.flip, [p.rx, p.ry, p.rz]);
    return { geometry, material };
  }, [fbx, map, normal, p.size, p.flip, p.rx, p.ry, p.rz]);
  return <mesh geometry={geometry} material={material} castShadow />;
}

/** A single animated creature, playing its baked clip, oriented by [rx,ry,rz]. */
function DebugCreature({ config, p }: { config: CreatureModel; p: DebugParams }) {
  const fbx = useFBX(config.fbx);
  const [map, normal] = useTexture([config.map, config.normal]);
  const group = useRef<THREE.Group>(null!);

  const { object, rawMax, center } = useMemo(() => {
    map.colorSpace = THREE.SRGBColorSpace;
    normal.colorSpace = THREE.NoColorSpace;
    const material = new THREE.MeshStandardMaterial({
      map,
      normalMap: normal,
      roughness: 0.8,
      metalness: 0,
    });
    const object = SkeletonUtils.clone(fbx);
    object.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.material = material;
      mesh.frustumCulled = false;
      mesh.castShadow = true;
    });
    object.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(object);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    return { object, rawMax: Math.max(size.x, size.y, size.z), center };
  }, [fbx, map, normal]);

  const { actions, names } = useAnimations(fbx.animations, group);
  useEffect(() => {
    const a = actions[names[0]];
    a?.reset().setLoop(THREE.LoopRepeat, Infinity).play();
    return () => {
      a?.stop();
    };
  }, [actions, names]);

  const s = p.size / rawMax;
  return (
    <group ref={group} rotation={[p.rx, p.ry, p.rz]}>
      <group scale={s} position={[-center.x * s, -center.y * s, -center.z * s]}>
        <primitive object={object} />
      </group>
    </group>
  );
}

export function CreatureDebugScene({
  selected,
  params,
  mode = "static",
}: {
  selected: CreatureKey;
  params: DebugParams;
  mode?: DebugMode;
}) {
  const isFish = selected === "juvenile" || selected === "scad";
  const wide = mode === "motion"; // pull the camera back to watch them roam
  return (
    <Canvas
      key={mode}
      shadows
      camera={{ position: wide ? [0, 60, 110] : [3, 2, 5], fov: 45, far: 500 }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={["#0b3547"]} />
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 8, 5]} intensity={1.4} castShadow />
      <gridHelper args={wide ? [200, 40, "#2e6b80", "#143844"] : [10, 10, "#2e6b80", "#1b4456"]} />
      {/* forward reference arrow (static tuning only) */}
      {!wide && (
        <arrowHelper args={[new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), 3, "#19c6c6", 0.5, 0.3]} />
      )}

      <Suspense fallback={null}>
        {mode === "static" ? (
          isFish ? (
            <DebugFish model={FISH[selected as "juvenile" | "scad"]} p={params} />
          ) : (
            <DebugCreature config={CREATURES[selected as "turtle" | "dugong"]} p={params} />
          )
        ) : isFish ? (
          <FishSchool
            model={FISH[selected as "juvenile" | "scad"]}
            mode={selected === "scad" ? "player" : "ahead"}
            visible
          />
        ) : (
          <AnimatedCreatures
            config={CREATURES[selected as "turtle" | "dugong"]}
            count={selected === "turtle" ? TURTLE_COUNT : DUGONG_COUNT}
            visible
          />
        )}
      </Suspense>

      <OrbitControls makeDefault target={[0, wide ? 4 : 0, 0]} />
    </Canvas>
  );
}
