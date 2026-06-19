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
const FRONT_OFFSET = 0; // at yaw 0 the model already faces +Z (toward the camera)
const SWIM_LEAN = Math.PI * 0.42; // forward tilt so the diver swims prone, not upright
const TRANSITION_DUR = 2.4; // seconds for the personalise → playing camera move

const smooth = (x: number) => x * x * (3 - 2 * x); // smoothstep easing

const _camGoal = new THREE.Vector3();

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
  const face = useRef<THREE.Group>(null!); // yaw + pitch (facing / swim lean)
  const { camera } = useThree();
  const progress = useRef(0); // 0 = personalise framing, 1 = full gameplay
  const camStart = useRef<THREE.Vector3 | null>(null);
  const wasPlaying = useRef(false);

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const t = state.clock.elapsedTime;
    const { phase, diverTarget } = useGame.getState();
    const playing = phase === "playing";
    const p = pos.current.position;
    // yaw first, then the swim lean (pitch) in the facing frame
    face.current.rotation.order = "YXZ";

    // detect entering / leaving the playing phase
    if (playing !== wasPlaying.current) {
      if (playing) camStart.current = camera.position.clone(); // ease from orbit pose
      else progress.current = 0;
      wasPlaying.current = playing;
    }
    // advance the timed transition
    if (playing && progress.current < 1) {
      progress.current = Math.min(1, progress.current + dt / TRANSITION_DUR);
    }
    const e = smooth(progress.current);
    const bob = Math.sin(t * (playing ? 1.5 : 0.8)) * (playing ? 0.08 : 0.12);

    // --- diver position: glide x/z toward the tapped point; descend via e ---
    const tx = playing && diverTarget ? diverTarget[0] : 0;
    const tz = playing && diverTarget ? diverTarget[2] : 0;
    const dx = tx - p.x;
    const dz = tz - p.z;
    const glide = 1 - Math.pow(0.05, dt);
    p.x += dx * glide;
    p.z += dz * glide;
    p.y = THREE.MathUtils.lerp(FLOAT_Y, SWIM_HEIGHT, e) + bob;

    // --- facing: turn toward travel direction; lean forward while swimming ---
    let targetYaw = face.current.rotation.y;
    if (playing && dx * dx + dz * dz > 4e-4) targetYaw = Math.atan2(dx, dz) + FRONT_OFFSET;
    else if (!playing) targetYaw = FRONT_OFFSET;
    face.current.rotation.y = THREE.MathUtils.damp(face.current.rotation.y, targetYaw, 6, dt);
    face.current.rotation.x = THREE.MathUtils.damp(face.current.rotation.x, SWIM_LEAN * e, 6, dt);

    // --- camera ---
    if (playing) {
      _camGoal.set(p.x, p.y + 6, p.z + 11);
      if (progress.current < 1 && camStart.current) {
        camera.position.lerpVectors(camStart.current, _camGoal, e); // timed ease-in
      } else {
        camera.position.lerp(_camGoal, 1 - Math.pow(0.02, dt)); // gentle follow after
      }
      camera.lookAt(p.x, p.y, p.z);
    } else {
      // OrbitControls owns the camera; keep its target on the floating diver
      controls.current?.target.lerp(p, 1 - Math.pow(0.01, dt));
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
