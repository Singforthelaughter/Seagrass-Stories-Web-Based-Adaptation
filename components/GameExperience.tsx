"use client";

import { useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { Seafloor } from "./scene/Seafloor";
import { Diver } from "./scene/Diver";
import { UnderwaterEnvironment } from "./scene/UnderwaterEnvironment";
import { useGame } from "@/lib/store";

const WATER_COLOR = "#0b3547";
const SWIM_HEIGHT = 1.3; // diver height above the seafloor while playing
const FLOAT_Y = 7; // diver floats up here while personalising (floor out of view)
const FRONT_OFFSET = Math.PI; // model's front is -Z; rotate so it faces the camera

const _desired = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _camGoal = new THREE.Vector3();
const _look = new THREE.Vector3();

/**
 * Drives the diver + camera for both phases in a single scene so the move from
 * "personalise" (floating, inspected up close) to "playing" (swimming the
 * meadow) is one smooth, continuous animation rather than a page swap.
 */
function DiverRig({
  controls,
}: {
  controls: React.RefObject<OrbitControlsImpl | null>;
}) {
  const pos = useRef<THREE.Group>(null!); // world position
  const face = useRef<THREE.Group>(null!); // yaw / facing
  const { camera } = useThree();

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const t = state.clock.elapsedTime;
    const { phase, diverTarget } = useGame.getState();
    const playing = phase === "playing";
    const bob = Math.sin(t * (playing ? 1.5 : 0.8)) * (playing ? 0.08 : 0.12);

    // --- diver position ---
    if (playing) {
      const tx = diverTarget ? diverTarget[0] : pos.current.position.x;
      const tz = diverTarget ? diverTarget[2] : pos.current.position.z;
      _desired.set(tx, SWIM_HEIGHT + bob, tz);
    } else {
      _desired.set(0, FLOAT_Y + bob, 0);
    }
    // smooth lerp also produces the descent when phase flips to playing
    pos.current.position.lerp(_desired, 1 - Math.pow(0.0016, dt));

    // --- facing ---
    let targetYaw = 0;
    if (playing) {
      _dir.set(_desired.x - pos.current.position.x, 0, _desired.z - pos.current.position.z);
      if (_dir.lengthSq() > 4e-4) targetYaw = Math.atan2(_dir.x, _dir.z);
      else targetYaw = face.current.rotation.y - FRONT_OFFSET; // hold heading
    }
    face.current.rotation.y = THREE.MathUtils.damp(
      face.current.rotation.y,
      targetYaw + FRONT_OFFSET,
      6,
      dt,
    );

    // --- camera ---
    if (playing) {
      // follow-cam; on the first frames it eases from wherever OrbitControls left it
      _camGoal.set(
        pos.current.position.x,
        pos.current.position.y + 6,
        pos.current.position.z + 11,
      );
      camera.position.lerp(_camGoal, 1 - Math.pow(0.004, dt));
      _look.copy(pos.current.position);
      camera.lookAt(_look);
    } else {
      // OrbitControls owns the camera; keep its target on the floating diver
      const c = controls.current;
      if (c) c.target.lerp(pos.current.position, 1 - Math.pow(0.01, dt));
    }
  });

  return (
    <group ref={pos} position={[0, FLOAT_Y, 0]}>
      <group ref={face} rotation={[0, FRONT_OFFSET, 0]}>
        <Diver targetLength={2.3} />
      </group>
    </group>
  );
}

function Controls({
  controls,
}: {
  controls: React.RefObject<OrbitControlsImpl | null>;
}) {
  const phase = useGame((s) => s.phase);
  return (
    <OrbitControls
      ref={controls}
      enabled={phase === "personalise"}
      enablePan={false}
      enableDamping
      minDistance={2.5}
      maxDistance={8}
      // don't let the player tilt down far enough to reveal the seafloor
      minPolarAngle={Math.PI * 0.18}
      maxPolarAngle={Math.PI * 0.52}
      target={[0, FLOAT_Y, 0]}
    />
  );
}

export function GameExperience() {
  const controls = useRef<OrbitControlsImpl | null>(null);

  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ position: [0, FLOAT_Y + 0.3, 4.2], fov: 46, near: 0.1, far: 200 }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={[WATER_COLOR]} />
      <fog attach="fog" args={[WATER_COLOR, 14, 60]} />

      <ambientLight intensity={0.6} color="#9fd8e6" />
      <hemisphereLight args={["#bdeaf6", "#0a2a36", 0.7]} />
      <directionalLight
        position={[6, 18, 8]}
        intensity={1.2}
        color="#dff4ff"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />

      <UnderwaterEnvironment />
      <Seafloor />
      <DiverRig controls={controls} />
      <Controls controls={controls} />
    </Canvas>
  );
}
