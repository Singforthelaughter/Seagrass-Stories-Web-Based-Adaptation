"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useQualityTier } from "@/lib/useQualityTier";
import { useGame } from "@/lib/store";

/**
 * A school of fish driven by CPU boids (Reynolds: separation / alignment /
 * cohesion) plus a soft pull back toward a centre so they stay together.
 * All fish share ONE InstancedMesh → a single draw call for the whole school.
 *
 * Placeholder geometry is a cone; its tip sits at +Y, so we align each fish's
 * +Y axis to its velocity — the pointy end leads, i.e. the "head" of the fish.
 *
 * Neighbour lookups use a spatial hash grid (cell = perception radius) so the
 * cost is ~O(n) rather than O(n²), keeping it mobile-friendly.
 */

// --- tuning ---------------------------------------------------------------
const PERCEPTION = 3.0; // neighbour radius (also the grid cell size)
const SEP_DIST = 1.7; // start pushing apart closer than this
const MAX_SPEED = 3.4;
const MIN_SPEED = 1.3;
const MAX_FORCE = 8.0; // steering acceleration clamp (room for avoidance)
const W_SEP = 2.3;
const W_ALI = 1.0;
const W_COH = 0.55;
const W_BOUND = 2.2; // pull back when outside the school sphere
const BOUND_RADIUS = 8.0; // larger volume → more dispersed shoal

// Predators to flee: the diver and the camera (so fish never swim through view).
const DIVER_AVOID = 3.0;
const W_DIVER = 12.0;
const CAMERA_AVOID = 3.2;
const W_CAMERA = 14.0;

// Seafloor avoidance: steer up smoothly when within FLOOR_AVOID of the seabed
// (seafloor sits at y=0), so fish hug just above it without diving through.
const FLOOR_Y = 0;
const FLOOR_AVOID = 1.8; // height at which the upward push begins
const W_FLOOR = 6.0; // strength of the avoidance
const FLOOR_MIN = 0.5; // hard safety floor as a last resort

const FISH_LENGTH = 0.6;
const FISH_RADIUS = 0.16;

// Default school centre — low, just above the seafloor.
const DEFAULT_CENTER: [number, number, number] = [0, 2.3, 0];

// Camera-following: keep the school roughly this far ahead of the camera, at a
// fixed near-floor height, but only ease the centre when the ideal point drifts
// outside a deadzone — so the follow stays subtle, not glued to the view.
const AHEAD_DIST = 15; // units in front of the camera
const SCHOOL_Y = 2.2; // fixed school height above the seafloor
const FOLLOW_DEADZONE = 5; // don't reposition until the target strays this far
const FOLLOW_BASE = 0.4; // easing base (smaller = faster catch-up); ~1.4s settle

const UP_Y = new THREE.Vector3(0, 1, 0); // cone tip axis → aligned to velocity
const _fwd = new THREE.Vector3();
const _target = new THREE.Vector3();

// scratch vectors (one school instance; reused each frame to avoid GC churn)
const _sep = new THREE.Vector3();
const _ali = new THREE.Vector3();
const _coh = new THREE.Vector3();
const _diff = new THREE.Vector3();
const _steer = new THREE.Vector3();
const _toCenter = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _away = new THREE.Vector3();

const cellKey = (x: number, y: number, z: number) =>
  `${Math.floor(x / PERCEPTION)},${Math.floor(y / PERCEPTION)},${Math.floor(z / PERCEPTION)}`;

export function FishSchool({
  center = DEFAULT_CENTER,
  follow = true,
}: {
  center?: [number, number, number];
  /** Slowly drift the school to stay ahead of the camera (subtly). */
  follow?: boolean;
}) {
  const tier = useQualityTier();
  const count = tier === "low" ? 40 : 120;
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const { camera } = useThree();

  const centerVec = useMemo(() => new THREE.Vector3(...center), [center]);

  // Simulation state, created once.
  const sim = useMemo(() => {
    const pos: THREE.Vector3[] = [];
    const vel: THREE.Vector3[] = [];
    for (let i = 0; i < count; i++) {
      // random point in a sphere around the centre
      const r = Math.cbrt(Math.random()) * BOUND_RADIUS * 0.8;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pos.push(
        new THREE.Vector3(
          centerVec.x + r * Math.sin(phi) * Math.cos(theta),
          centerVec.y + r * Math.sin(phi) * Math.sin(theta),
          centerVec.z + r * Math.cos(phi),
        ),
      );
      const v = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5,
      )
        .normalize()
        .multiplyScalar((MIN_SPEED + MAX_SPEED) * 0.5);
      vel.push(v);
    }
    return { pos, vel, dummy: new THREE.Object3D(), grid: new Map<string, number[]>() };
  }, [count, centerVec]);

  useFrame((_state, delta) => {
    const dt = Math.min(delta, 0.05);
    const { pos, vel, dummy, grid } = sim;
    const diverPos = useGame.getState().diverPos; // live, mutated in place
    const camPos = camera.position;

    // 0) ease the school centre toward a point ahead of the camera (subtle).
    //    Flatten the look direction to keep the target at a near-floor height,
    //    and only move once it drifts past the deadzone, so small camera moves
    //    don't visibly tug the school.
    if (follow) {
      camera.getWorldDirection(_fwd);
      _fwd.y = 0;
      if (_fwd.lengthSq() < 1e-4) _fwd.set(0, 0, -1);
      else _fwd.normalize();
      _target.copy(camera.position).addScaledVector(_fwd, AHEAD_DIST);
      _target.y = SCHOOL_Y;
      if (centerVec.distanceTo(_target) > FOLLOW_DEADZONE) {
        centerVec.lerp(_target, 1 - Math.pow(FOLLOW_BASE, dt));
      }
    }

    // 1) rebuild the spatial hash grid
    grid.clear();
    for (let i = 0; i < count; i++) {
      const p = pos[i];
      const key = cellKey(p.x, p.y, p.z);
      const bucket = grid.get(key);
      if (bucket) bucket.push(i);
      else grid.set(key, [i]);
    }

    // 2) steer each fish from its neighbours (27 surrounding cells)
    for (let i = 0; i < count; i++) {
      const p = pos[i];
      const v = vel[i];
      _sep.set(0, 0, 0);
      _ali.set(0, 0, 0);
      _coh.set(0, 0, 0);
      let n = 0;

      const cx = Math.floor(p.x / PERCEPTION);
      const cy = Math.floor(p.y / PERCEPTION);
      const cz = Math.floor(p.z / PERCEPTION);
      for (let gx = -1; gx <= 1; gx++) {
        for (let gy = -1; gy <= 1; gy++) {
          for (let gz = -1; gz <= 1; gz++) {
            const bucket = grid.get(`${cx + gx},${cy + gy},${cz + gz}`);
            if (!bucket) continue;
            for (const j of bucket) {
              if (j === i) continue;
              const q = pos[j];
              const d = p.distanceTo(q);
              if (d > PERCEPTION || d === 0) continue;
              _ali.add(vel[j]);
              _coh.add(q);
              if (d < SEP_DIST) {
                _diff.subVectors(p, q).divideScalar(d * d); // stronger when closer
                _sep.add(_diff);
              }
              n++;
            }
          }
        }
      }

      _steer.set(0, 0, 0);
      if (n > 0) {
        _ali.divideScalar(n).sub(v).multiplyScalar(W_ALI);
        _coh.divideScalar(n).sub(p).multiplyScalar(W_COH);
        _sep.multiplyScalar(W_SEP);
        _steer.add(_ali).add(_coh).add(_sep);
      }

      // soft containment: pull back toward the centre past the sphere edge
      _toCenter.subVectors(centerVec, p);
      const distC = _toCenter.length();
      if (distC > BOUND_RADIUS) {
        _toCenter.multiplyScalar((W_BOUND * (distC - BOUND_RADIUS)) / BOUND_RADIUS);
        _steer.add(_toCenter);
      }

      // seafloor avoidance: ramp an upward push as the fish nears the seabed
      const above = p.y - FLOOR_Y;
      if (above < FLOOR_AVOID) {
        const t = 1 - Math.max(above, 0) / FLOOR_AVOID; // 0 at threshold → 1 at floor
        _steer.y += W_FLOOR * t * t;
      }

      // flee the diver
      _away.subVectors(p, diverPos);
      const dD = _away.length();
      if (dD > 1e-3 && dD < DIVER_AVOID) {
        const t = 1 - dD / DIVER_AVOID;
        _steer.addScaledVector(_away.divideScalar(dD), W_DIVER * t * t);
      }

      // flee the camera (so fish never swim into the viewer's face)
      _away.subVectors(p, camPos);
      const dC = _away.length();
      if (dC > 1e-3 && dC < CAMERA_AVOID) {
        const t = 1 - dC / CAMERA_AVOID;
        _steer.addScaledVector(_away.divideScalar(dC), W_CAMERA * t * t);
      }

      // clamp steering, integrate velocity, clamp speed
      if (_steer.lengthSq() > MAX_FORCE * MAX_FORCE) _steer.setLength(MAX_FORCE);
      v.addScaledVector(_steer, dt);
      const sp = v.length();
      if (sp > MAX_SPEED) v.setLength(MAX_SPEED);
      else if (sp < MIN_SPEED) v.setLength(MIN_SPEED);

      p.addScaledVector(v, dt);

      // hard safety floor (the avoidance force above does the real work)
      if (p.y < FLOOR_MIN) {
        p.y = FLOOR_MIN;
        if (v.y < 0) v.y = 0;
      }
    }

    // 3) write instance matrices (point the cone tip / head along velocity)
    for (let i = 0; i < count; i++) {
      const p = pos[i];
      _dir.copy(vel[i]).normalize();
      dummy.position.copy(p);
      dummy.quaternion.setFromUnitVectors(UP_Y, _dir);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, count]}
      frustumCulled={false}
      castShadow
    >
      <coneGeometry args={[FISH_RADIUS, FISH_LENGTH, 7]} />
      <meshStandardMaterial color="#ff8a4c" roughness={0.6} metalness={0.1} />
    </instancedMesh>
  );
}
