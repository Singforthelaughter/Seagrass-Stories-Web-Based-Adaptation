"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "@/lib/store";
import type { RayParams } from "@/lib/store";

const GAMEPLAY_Y = 1.3; // diver's swim height (rays rest at centerY here)
const VERTICAL_FOLLOW = 0.3; // fraction of the diver's descent the rays sink by

/**
 * Sun rays as a particle system: each particle is a long thin cylinder shaded
 * with an inverse fresnel — the surface facing the camera reads white/opaque and
 * the silhouette edges fade to transparent, so each cylinder looks like a soft
 * glowing volumetric light shaft. Instanced → one draw call. Additive blending
 * makes overlaps glow. Visible from any camera angle, on every quality tier.
 *
 * Params come live from the store so the debug page / ?tune sliders can adjust
 * them; bake the values into the store defaults once dialled in.
 */

const vertexShader = /* glsl */ `
attribute float aPhase;
varying float vFacing;
varying float vFade;
varying float vWorldY;
varying vec2 vUv;
uniform float uTime;
uniform float uFadeSpeed;
void main() {
  vUv = uv;
  vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  vWorldY = (modelMatrix * instanceMatrix * vec4(position, 1.0)).y;
  // normal through the instance + view transform (radial normals on a thin
  // cylinder; uniform-enough scale that this reads correctly for the glow)
  vec3 n = normalize(normalMatrix * (mat3(instanceMatrix) * normal));
  vec3 viewDir = normalize(-mvPosition.xyz);
  vFacing = abs(dot(n, viewDir)); // 1 = facing camera (inner), 0 = silhouette
  // each ray fades in and out on its own phase
  vFade = 0.5 + 0.5 * sin(uTime * uFadeSpeed + aPhase);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const fragmentShader = /* glsl */ `
varying float vFacing;
varying float vFade;
varying float vWorldY;
varying vec2 vUv;
uniform vec3 uColor;
uniform float uIntensity;
uniform float uPower;
void main() {
  // inner (facing) white → outer (edge) transparent
  float a = pow(vFacing, uPower);
  // fade the lower end so shafts dissolve as they descend
  a *= smoothstep(0.0, 0.3, vUv.y);
  // dissolve before reaching the seabed (y=0) so there's no hard depth-cut line
  a *= smoothstep(0.0, 6.0, vWorldY);
  a *= uIntensity * vFade;
  gl_FragColor = vec4(uColor * a, a);
}
`;

function RayInstances({
  count,
  length,
  radius,
  intensity,
  power,
  tilt,
  spread,
  centerY,
  speed,
  fadeSpeed,
  color,
}: RayParams & { color: string }) {
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const group = useRef<THREE.Group>(null!);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uColor: { value: new THREE.Color(color) },
          uIntensity: { value: intensity },
          uPower: { value: power },
          uTime: { value: 0 },
          uFadeSpeed: { value: fadeSpeed },
        },
        transparent: true,
        depthWrite: false,
        // Additive RGB, but DON'T touch the framebuffer alpha — otherwise the
        // EffectComposer composites the corrupted edge alpha as dark fringes.
        blending: THREE.CustomBlending,
        blendEquation: THREE.AddEquation,
        blendSrc: THREE.SrcAlphaFactor,
        blendDst: THREE.OneFactor,
        blendEquationAlpha: THREE.AddEquation,
        blendSrcAlpha: THREE.ZeroFactor,
        blendDstAlpha: THREE.OneFactor,
        side: THREE.DoubleSide,
        toneMapped: false,
        fog: false,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Place the cylinders + assign a random fade phase. Re-runs on layout change.
  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    const tiltRad = (tilt * Math.PI) / 180;
    const phases = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const az = Math.random() * Math.PI * 2; // position azimuth
      const r = Math.sqrt(Math.random()) * spread; // uniform disc spread
      dummy.position.set(Math.cos(az) * r, centerY, Math.sin(az) * r);
      // lean each ray a bit in a random horizontal direction
      const leanDir = Math.random() * Math.PI * 2;
      const amt = tiltRad * (0.4 + Math.random() * 0.6);
      dummy.rotation.set(amt * Math.cos(leanDir), Math.random() * Math.PI, amt * Math.sin(leanDir));
      dummy.scale.set(radius, length, radius);
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
      phases[i] = Math.random() * Math.PI * 2;
    }
    mesh.current.instanceMatrix.needsUpdate = true;
    mesh.current.geometry.setAttribute("aPhase", new THREE.InstancedBufferAttribute(phases, 1));
  }, [count, length, radius, tilt, spread, centerY]);

  useFrame((_s, dt) => {
    const d = Math.min(dt, 0.05);
    material.uniforms.uIntensity.value = intensity;
    material.uniforms.uPower.value = power;
    material.uniforms.uColor.value.set(color);
    material.uniforms.uFadeSpeed.value = fadeSpeed;
    material.uniforms.uTime.value += d;
    group.current.rotation.y += d * speed * 0.1; // gentle drift
    // sink the whole field a little as the diver/camera descend (a fraction of
    // the drop), so the rays follow downward without fully tracking the camera
    const diverY = useGame.getState().diverPos.y;
    const targetY = (diverY - GAMEPLAY_Y) * VERTICAL_FOLLOW;
    group.current.position.y = THREE.MathUtils.damp(group.current.position.y, targetY, 2.5, d);
  });

  return (
    <group ref={group}>
      <instancedMesh ref={mesh} args={[undefined, undefined, count]} material={material} frustumCulled={false}>
        {/* radius 1, height 1, open-ended; scaled per-instance. Higher segment
            count keeps the silhouette smooth (no faceted edge lines). */}
        <cylinderGeometry args={[1, 1, 1, 24, 1, true]} />
      </instancedMesh>
    </group>
  );
}

export function SunRays({ color = "#eaf7ff" }: { color?: string }) {
  const rays = useGame((s) => s.rays);
  // Remount when the instance count changes (InstancedMesh size is fixed).
  return <RayInstances key={rays.count} {...rays} color={color} />;
}
