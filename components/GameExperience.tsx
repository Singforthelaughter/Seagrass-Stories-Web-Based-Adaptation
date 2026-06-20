"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer } from "@react-three/postprocessing";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import { Seafloor } from "./scene/Seafloor";
import { SeagrassField } from "./scene/Seagrass";
import { WaterDistortion } from "./scene/WaterDistortion";
import { Diver } from "./scene/Diver";
import { UnderwaterEnvironment } from "./scene/UnderwaterEnvironment";
import { useGame } from "@/lib/store";
import { smootherstep as smooth } from "@/lib/ease";

const WATER_COLOR = "#0b3547";
const SWIM_HEIGHT = 1.3; // diver height above the seafloor while playing
const FLOAT_Y = 16; // diver floats up here while personalising (floor well out of view)
const VIEW_DROP = 0.45; // aim the camera below the diver so it sits higher in frame
const FRONT_OFFSET = 0; // at yaw 0 the model already faces +Z (toward the camera)
const REST_HEADING = Math.PI; // while playing (idle), head points away from the camera
const SWIM_LEAN = Math.PI * 0.42; // forward tilt so the diver swims prone, not upright
const TRANSITION_DUR = 3.8; // seconds for the personalise → playing camera move
const SWIM_SPEED = 7; // world units / second at full joystick deflection
const SWIM_BOUND = 90; // keep the diver within the meadow

const _camGoal = new THREE.Vector3();

/**
 * Drives the diver + camera for both phases in a single scene so the move from
 * "personalise" (floating, inspected up close) to "playing" (swimming the
 * meadow) is one smooth, continuous animation rather than a page swap.
 */
function DiverRig({
  controls,
  progress,
}: {
  controls: React.RefObject<OrbitControlsImpl | null>;
  progress: React.RefObject<number>; // 0 = personalise framing, 1 = full gameplay
}) {
  const pos = useRef<THREE.Group>(null!); // world position
  const face = useRef<THREE.Group>(null!); // yaw + pitch (facing / swim lean)
  const headlamp = useRef<THREE.DirectionalLight>(null!); // follows the camera
  const headTarget = useMemo(() => new THREE.Object3D(), []);
  const { camera } = useThree();
  const camStart = useRef<THREE.Vector3 | null>(null);
  const yawStart = useRef(0);
  const wasPlaying = useRef(false);

  useFrame((state, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05);
    const t = state.clock.elapsedTime;
    const { phase, move } = useGame.getState();
    const playing = phase === "playing";
    const p = pos.current.position;
    // yaw first, then the swim lean (pitch) in the facing frame
    face.current.rotation.order = "YXZ";

    // detect entering / leaving the playing phase
    if (playing !== wasPlaying.current) {
      if (playing) {
        camStart.current = camera.position.clone(); // ease from orbit pose
        yawStart.current = face.current.rotation.y; // ease the turn from here
      } else {
        progress.current = 0;
      }
      wasPlaying.current = playing;
    }
    // advance the timed transition
    if (playing && progress.current < 1) {
      progress.current = Math.min(1, progress.current + dt / TRANSITION_DUR);
    }
    const e = smooth(progress.current);
    const bob = Math.sin(t * (playing ? 1.5 : 0.8)) * (playing ? 0.08 : 0.12);

    // --- diver position: joystick-driven once swimming; descend via e ---
    const mx = move[0];
    const mz = move[1];
    const moving = playing && progress.current >= 1 && mx * mx + mz * mz > 0.01;
    if (moving) {
      const step = SWIM_SPEED * dt;
      p.x = THREE.MathUtils.clamp(p.x + mx * step, -SWIM_BOUND, SWIM_BOUND);
      p.z = THREE.MathUtils.clamp(p.z + mz * step, -SWIM_BOUND, SWIM_BOUND);
    }
    p.y = THREE.MathUtils.lerp(FLOAT_Y, SWIM_HEIGHT, e) + bob;

    // --- facing: turn toward travel direction; lean forward while swimming ---
    if (!playing) {
      // face the camera while personalising
      face.current.rotation.y = THREE.MathUtils.damp(face.current.rotation.y, FRONT_OFFSET, 5, dt);
      face.current.rotation.x = THREE.MathUtils.damp(face.current.rotation.x, 0, 5, dt);
    } else {
      if (progress.current < 1 && !moving) {
        // during the dive-in, turn on the same eased timeline as the camera
        face.current.rotation.y = THREE.MathUtils.lerp(yawStart.current, REST_HEADING, e);
      } else {
        const targetYaw = moving ? Math.atan2(mx, mz) + FRONT_OFFSET : REST_HEADING;
        // take the shortest way round (wrap the delta into [-PI, PI])
        const cur = face.current.rotation.y;
        const delta = Math.atan2(Math.sin(targetYaw - cur), Math.cos(targetYaw - cur));
        face.current.rotation.y = THREE.MathUtils.damp(cur, cur + delta, 6, dt);
      }
      // lean is bound to the transition (and stays at full lean once swimming)
      face.current.rotation.x = SWIM_LEAN * e;
    }

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
      // OrbitControls owns the camera; aim a touch below the diver so it sits
      // higher in the frame (above the personalise panel).
      controls.current?.target.lerp(
        _camGoal.set(p.x, p.y - VIEW_DROP, p.z),
        1 - Math.pow(0.01, dt),
      );
    }

    // --- headlamp: keep the side we're looking at lit (from the camera) ---
    if (headlamp.current) {
      headlamp.current.position.copy(camera.position);
      headTarget.position.set(p.x, p.y, p.z);
      headTarget.updateMatrixWorld();
    }
  });

  return (
    <>
      <group ref={pos} position={[0, FLOAT_Y, 0]}>
        <group ref={face} rotation={[0, FRONT_OFFSET, 0]}>
          <Diver targetLength={2.3} />
        </group>
      </group>
      <directionalLight ref={headlamp} intensity={1.1} color="#eaf7ff" target={headTarget} />
      <primitive object={headTarget} />
    </>
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
      target={[0, FLOAT_Y - VIEW_DROP, 0]}
    />
  );
}

export function GameExperience() {
  const controls = useRef<OrbitControlsImpl | null>(null);
  const progress = useRef(0); // dive-in transition: 0 = personalise, 1 = playing

  return (
    <Canvas
      shadows
      dpr={[1, 1.5]}
      camera={{ position: [0, FLOAT_Y - VIEW_DROP + 0.3, 4.2], fov: 46, near: 0.1, far: 200 }}
      gl={{ antialias: true }}
    >
      <color attach="background" args={[WATER_COLOR]} />
      <fog attach="fog" args={[WATER_COLOR, 14, 60]} />

      <ambientLight intensity={0.75} color="#9fd8e6" />
      <hemisphereLight args={["#bdeaf6", "#0a2a36", 0.8]} />
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
      <Seafloor progress={progress} />
      <SeagrassField progress={progress} />
      <DiverRig controls={controls} progress={progress} />
      <Controls controls={controls} />

      {/* Subtle "through water" wobble over the whole 3D scene (not the UI).
          A single UV-warp pass — very cheap; multisampling kept low for tablets. */}
      <EffectComposer multisampling={2} enableNormalPass={false}>
        <WaterDistortion amplitude={0.0035} frequency={16} speed={0.8} />
      </EffectComposer>
    </Canvas>
  );
}
