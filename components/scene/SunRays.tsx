"use client";

import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGame } from "@/lib/store";

/**
 * Underwater sun shafts as cheap additive "curtain" planes rather than
 * screen-space god rays — visible from any angle (the real sun is overhead and
 * never in frame). A few large vertical quads cross the scene; a tiny fragment
 * shader draws soft drifting vertical beams. Additive blending makes the
 * overlaps glow. Static (centred on the world) and large enough to span the
 * whole meadow, so the camera is never embedded in them. Runs on every tier.
 *
 * Params are read live from the store so the temporary ?tune sliders can adjust
 * them; once dialled in, bake the values into the store defaults.
 */

const ANGLES = [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4]; // crossed curtains

const vertexShader = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const fragmentShader = /* glsl */ `
varying vec2 vUv;
uniform float uTime;
uniform vec3 uColor;
uniform float uIntensity;
uniform float uFreq;
uniform float uSharp;

float shafts(float x, float t) {
  x *= uFreq;
  float a = sin(x * 5.0 + t * 0.20) * 0.5 + 0.5;
  a = pow(a, uSharp);                               // beam width (higher = thinner)
  float b = sin(x * 11.0 - t * 0.13) * 0.5 + 0.5;
  b = pow(b, max(1.0, uSharp * 0.6));
  return a * 0.8 + b * 0.5;
}

void main() {
  float rays = shafts(vUv.x, uTime);
  float topFade = smoothstep(-0.1, 0.7, vUv.y);    // strong up high, still at eye level
  float edgeFade = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x);
  float a = rays * topFade * edgeFade * uIntensity;
  gl_FragColor = vec4(uColor * a, a);
}
`;

export function SunRays({ color = "#cfeeff" }: { color?: string }) {
  const rays = useGame((s) => s.rays); // re-render on slider change (cheap)

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(color) },
          uIntensity: { value: rays.intensity },
          uFreq: { value: rays.freq },
          uSharp: { value: rays.sharp },
        },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        toneMapped: false,
        fog: false,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [color],
  );

  useFrame((state, dt) => {
    const r = useGame.getState().rays;
    material.uniforms.uTime.value += Math.min(dt, 0.05) * r.speed;
    material.uniforms.uIntensity.value = r.intensity;
    material.uniforms.uFreq.value = r.freq;
    material.uniforms.uSharp.value = r.sharp;
  });

  return (
    <group position={[0, rays.centerY, 0]}>
      {ANGLES.map((a, i) => (
        <mesh key={i} rotation={[0, a, 0]} material={material} renderOrder={2}>
          <planeGeometry args={[rays.width, rays.height]} />
        </mesh>
      ))}
    </group>
  );
}
