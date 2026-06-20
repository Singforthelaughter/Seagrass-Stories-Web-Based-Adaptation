"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { smootherstep } from "@/lib/ease";

/**
 * The sandy seafloor. Hidden (scale 0) during personalise, then grows in on
 * the same eased timeline as the dive-in transition.
 *
 * It also renders animated **caustics** — the rippling refracted sunlight you
 * see on a seabed — injected into a standard PBR material via onBeforeCompile,
 * so the floor keeps its normal lighting/shadows and just gains the moving
 * light pattern on top. This is applied to the seafloor material ONLY.
 */

// Classic tileable water caustic (after Dave Hoskins, Shadertoy MdlXz8),
// trimmed to 4 iterations for cheaper per-pixel cost.
const CAUSTIC_FN = /* glsl */ `
#define CAUSTIC_TAU 6.28318530718
float seafloorCaustic(vec2 uv, float time) {
  vec2 p = mod(uv * CAUSTIC_TAU, CAUSTIC_TAU) - 250.0;
  vec2 i = vec2(p);
  float c = 1.0;
  float inten = 0.005;
  for (int n = 0; n < 4; n++) {
    float t = time * (1.0 - (3.5 / float(n + 1)));
    i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + t) / inten), p.y / (cos(i.y + t) / inten)));
  }
  c /= 4.0;
  c = 1.17 - pow(c, 1.4);
  return pow(abs(c), 8.0);
}
`;

export function Seafloor({ progress }: { progress: React.RefObject<number> }) {
  const ref = useRef<THREE.Mesh>(null!);
  // Shared time uniform: the same object is handed to the compiled shader, so
  // mutating .value each frame animates the caustics without recompiling.
  const time = useRef({ value: 0 });

  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      color: "#c2a878",
      roughness: 1,
      metalness: 0,
    });

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uCausticTime = time.current;
      shader.uniforms.uCausticScale = { value: 0.13 }; // feature size (smaller = bigger cells)
      shader.uniforms.uCausticStrength = { value: 0.55 };
      shader.uniforms.uCausticColor = { value: new THREE.Color("#cdf3ff") };

      // Pass world position through so caustics sit in world space (stable as
      // the floor scales in and as the diver swims over it).
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          "#include <common>\nvarying vec3 vSeafloorWorld;",
        )
        .replace(
          "#include <worldpos_vertex>",
          "#include <worldpos_vertex>\n  vSeafloorWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;",
        );

      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          "#include <common>\nvarying vec3 vSeafloorWorld;\nuniform float uCausticTime;\nuniform float uCausticScale;\nuniform float uCausticStrength;\nuniform vec3 uCausticColor;\n" +
            CAUSTIC_FN,
        )
        // Add caustics as linear light just before tonemapping, so they fade
        // naturally with the underwater fog further out.
        .replace(
          "#include <tonemapping_fragment>",
          "{\n  vec2 cuv = vSeafloorWorld.xz * uCausticScale;\n  float cc = seafloorCaustic(cuv, uCausticTime);\n  gl_FragColor.rgb += uCausticColor * cc * uCausticStrength;\n}\n#include <tonemapping_fragment>",
        );
    };

    return mat;
  }, []);

  useFrame((state) => {
    const e = smootherstep(progress.current);
    ref.current.visible = e > 0.001;
    ref.current.scale.setScalar(Math.max(e, 1e-4));
    time.current.value = state.clock.elapsedTime * 0.3; // caustic drift speed
  });

  return (
    <mesh
      ref={ref}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      scale={0}
      visible={false}
      receiveShadow
      material={material}
    >
      <planeGeometry args={[200, 200, 1, 1]} />
    </mesh>
  );
}
