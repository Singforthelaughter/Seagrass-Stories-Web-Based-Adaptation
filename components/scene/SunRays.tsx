"use client";

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Underwater sun shafts done as cheap additive "curtain" planes rather than
 * screen-space god rays — so the rays are always visible regardless of where the
 * camera looks (the real sun is overhead and never in frame).
 *
 * A few large vertical quads cross through the scene at different yaws; a tiny
 * fragment shader draws soft vertical streaks (brightest near the surface,
 * fading downward) with slow horizontal drift. Additive blending makes the
 * overlaps glow like volumetric light. The whole set follows the camera in XZ
 * so the player is always within the shafts. Runs on every quality tier.
 */

const PLANE_W = 70;
const PLANE_H = 70;
const CENTER_Y = 15; // vertical centre; spans roughly y = -20 .. 50
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

// soft vertical shafts from layered sines drifting sideways over time
float shafts(float x, float t) {
  float a = sin(x * 5.0 + t * 0.20) * 0.5 + 0.5;
  a = pow(a, 3.0);                                  // sharpen into distinct beams
  float b = sin(x * 11.0 - t * 0.13) * 0.5 + 0.5;
  b = pow(b, 2.0);
  return a * 0.8 + b * 0.5;
}

void main() {
  float rays = shafts(vUv.x, uTime);
  // brightest up high but still strong at eye level; soft fade at very bottom
  float topFade = smoothstep(-0.1, 0.7, vUv.y);
  float edgeFade = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x);
  float a = rays * topFade * edgeFade * uIntensity;
  gl_FragColor = vec4(uColor * a, a);
}
`;

export function SunRays({
  color = "#cfeeff",
  intensity = 1.2,
}: {
  color?: string;
  intensity?: number;
}) {
  const group = useRef<THREE.Group>(null!);
  const { camera } = useThree();

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(color) },
          uIntensity: { value: intensity },
        },
        transparent: true,
        depthWrite: false, // don't occlude the scene behind the rays
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        toneMapped: false,
        fog: false,
      }),
    [color, intensity],
  );

  useFrame((state, dt) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
    // follow the camera in XZ so the player stays within the shafts
    const k = 1 - Math.pow(0.01, Math.min(dt, 0.05));
    group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, camera.position.x, k);
    group.current.position.z = THREE.MathUtils.lerp(group.current.position.z, camera.position.z, k);
  });

  return (
    <group ref={group} position={[0, CENTER_Y, 0]}>
      {ANGLES.map((a, i) => (
        <mesh key={i} rotation={[0, a, 0]} material={material} renderOrder={2}>
          <planeGeometry args={[PLANE_W, PLANE_H]} />
        </mesh>
      ))}
    </group>
  );
}
