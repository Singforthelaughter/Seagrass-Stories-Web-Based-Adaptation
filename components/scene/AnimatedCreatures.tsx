"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFBX, useTexture, useAnimations } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";
import { CREATURE_FADE_IN, CREATURE_FADE_OUT } from "@/lib/gameConfig";
import type { CreatureModel } from "./creatures";

/**
 * A pod of large animated creatures (turtles / dugongs). Each instance is an
 * independently cloned skinned mesh that plays the model's baked clip on its own
 * mixer and wanders the meadow via a simple heading/depth controller. All
 * instances of a species share one material, so the whole pod fades in/out
 * together (driven by `visible`).
 */

const NORMAL_SCALE = new THREE.Vector2(1, 1);

export function AnimatedCreatures({
  config,
  count,
  visible = true,
}: {
  config: CreatureModel;
  count: number;
  /** false = fade the pod out (kept mounted until faded by the parent). */
  visible?: boolean;
}) {
  const fbx = useFBX(config.fbx);
  const [map, normal] = useTexture([config.map, config.normal]);

  // Apply a single shared material to the source meshes (clones inherit it),
  // and measure the model so each clone can be normalised to targetSize.
  const { material, normScale, center } = useMemo(() => {
    map.colorSpace = THREE.SRGBColorSpace;
    normal.colorSpace = THREE.NoColorSpace;
    const material = new THREE.MeshStandardMaterial({
      map,
      normalMap: normal,
      normalScale: NORMAL_SCALE,
      roughness: 0.8,
      metalness: 0,
      transparent: true, // for the fade
      opacity: 0,
    });
    fbx.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.material = material;
      mesh.frustumCulled = false;
    });
    fbx.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(fbx);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const normScale = config.targetSize / Math.max(size.x, size.y, size.z);
    return { material, normScale, center };
  }, [fbx, map, normal, config.targetSize]);

  // Fade the whole pod (shared material) in/out.
  useFrame((_s, dt) => {
    const target = visible ? 1 : 0;
    const dur = visible ? CREATURE_FADE_IN : CREATURE_FADE_OUT;
    const cur = material.opacity;
    const step = Math.min(dt, 0.05) / dur;
    material.opacity = cur < target ? Math.min(target, cur + step) : Math.max(target, cur - step);
  });

  // Spawn states, once. Rejection-sample so no two creatures start at the same
  // spot or overlapping (min horizontal separation scales with their size).
  const spawns = useMemo<Spawn[]>(() => {
    const out: Spawn[] = [];
    const sep = config.targetSize * 1.5; // min centre-to-centre distance
    let attempts = 0;
    while (out.length < count && attempts < count * 300) {
      attempts++;
      const ang = Math.random() * Math.PI * 2;
      const r = (0.05 + Math.random() * 0.5) * config.bound;
      const x = Math.cos(ang) * r;
      const z = Math.sin(ang) * r;
      if (out.some((s) => Math.hypot(s.x - x, s.z - z) < sep)) continue;
      out.push({
        x,
        z,
        y: config.yMin + Math.random() * (config.yMax - config.yMin),
        heading: Math.random() * Math.PI * 2,
        phase: Math.random(),
        wanderIn: Math.random() * config.wanderInterval,
      });
    }
    return out;
  }, [count, config.targetSize, config.bound, config.yMin, config.yMax, config.wanderInterval]);

  return (
    <>
      {spawns.map((s, i) => (
        <Wanderer
          key={i}
          fbx={fbx}
          config={config}
          normScale={normScale}
          center={center}
          spawn={s}
        />
      ))}
    </>
  );
}

type Spawn = {
  x: number;
  z: number;
  y: number;
  heading: number;
  phase: number;
  wanderIn: number;
};

function Wanderer({
  fbx,
  config,
  normScale,
  center,
  spawn,
}: {
  fbx: THREE.Group;
  config: CreatureModel;
  normScale: number;
  center: THREE.Vector3;
  spawn: Spawn;
}) {
  const group = useRef<THREE.Group>(null!);
  // Independent clone (own skeleton) so each creature animates separately.
  // Scale + recentre baked into the clone (offset cancels scale*centre BEFORE
  // the upright rotation, so it stays centred at any rotation).
  const object = useMemo(() => {
    const o = SkeletonUtils.clone(fbx);
    o.scale.setScalar(normScale);
    o.position.set(-center.x * normScale, -center.y * normScale, -center.z * normScale);
    return o;
  }, [fbx, normScale, center]);
  const { actions, names } = useAnimations(fbx.animations, group);

  // Play the baked clip, looped, with a random start phase so the pod isn't synced.
  useEffect(() => {
    const action = actions[names[0]];
    if (!action) return;
    action.reset().setLoop(THREE.LoopRepeat, Infinity).play();
    action.time = spawn.phase * (action.getClip().duration || 1);
    return () => {
      action.stop();
    };
  }, [actions, names, spawn.phase]);

  // wander state
  const heading = useRef(spawn.heading);
  const headingTarget = useRef(spawn.heading);
  const yTarget = useRef(spawn.y);
  const wanderTimer = useRef(spawn.wanderIn);
  const pos = useRef(new THREE.Vector3(spawn.x, spawn.y, spawn.z));

  useFrame((_s, deltaRaw) => {
    const dt = Math.min(deltaRaw, 0.05);
    const p = pos.current;

    // periodically pick a new heading + depth
    wanderTimer.current -= dt;
    if (wanderTimer.current <= 0) {
      headingTarget.current += (Math.random() - 0.5) * 2 * config.turnAmount;
      yTarget.current = config.yMin + Math.random() * (config.yMax - config.yMin);
      wanderTimer.current = config.wanderInterval * (0.6 + Math.random() * 0.8);
    }

    // turn back toward the centre if we've roamed past the bound (heading is
    // measured so that forward = +Z, i.e. angle from +Z toward +X).
    if (Math.hypot(p.x, p.z) > config.bound) {
      headingTarget.current = Math.atan2(-p.x, -p.z);
    }

    // damp heading toward target (shortest way round)
    let dh = headingTarget.current - heading.current;
    dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    heading.current += dh * Math.min(1, config.turnRate * dt);

    // advance along heading; ease depth
    p.x += Math.sin(heading.current) * config.speed * dt;
    p.z += Math.cos(heading.current) * config.speed * dt;
    p.y += (yTarget.current - p.y) * Math.min(1, dt * 0.4);

    group.current.position.copy(p);
    group.current.rotation.y = heading.current + config.yawOffset;
  });

  return (
    <group ref={group}>
      <group rotation={config.upright}>
        <primitive object={object} />
      </group>
    </group>
  );
}
