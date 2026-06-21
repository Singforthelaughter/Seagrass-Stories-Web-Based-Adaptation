"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { smootherstep } from "@/lib/ease";
import { useGame } from "@/lib/store";

/**
 * The sandy seafloor. Hidden (scale 0) during personalise, then grows in on
 * the same eased timeline as the dive-in transition.
 *
 * It also renders animated **caustics** — the rippling refracted sunlight you
 * see on a seabed — injected into a standard PBR material via onBeforeCompile,
 * so the floor keeps its normal lighting/shadows and just gains the moving
 * light pattern on top. This is applied to the seafloor material ONLY.
 */

// Classic tileable water caustic (after Dave Hoskins, Shadertoy MdlXz8).
// Iteration count is parametrised so low-end phones can run fewer.
const causticFn = (iterations: number) => /* glsl */ `
#define CAUSTIC_TAU 6.28318530718
float seafloorCaustic(vec2 uv, float time) {
  vec2 p = mod(uv * CAUSTIC_TAU, CAUSTIC_TAU) - 250.0;
  vec2 i = vec2(p);
  float c = 1.0;
  float inten = 0.005;
  for (int n = 0; n < ${iterations}; n++) {
    float t = time * (1.0 - (3.5 / float(n + 1)));
    i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + t) / inten), p.y / (cos(i.y + t) / inten)));
  }
  c /= float(${iterations});
  c = 1.17 - pow(c, 1.4);
  return pow(abs(c), 8.0);
}
`;

export function Seafloor({
  progress,
  children,
  lowQuality = false,
}: {
  progress: React.RefObject<number>;
  /** Rendered inside the same scaling group (e.g. the seagrass meadow), so it
   *  grows in together with the floor. Children are NOT rotated like the plane. */
  children?: React.ReactNode;
  /** Low-end phones: fewer caustic iterations + a single layer. */
  lowQuality?: boolean;
}) {
  const ref = useRef<THREE.Group>(null!);
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
      shader.uniforms.uCausticStrength = { value: 0.34 };
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

      // Low tier: fewer iterations and a single caustic layer. Full tier blends
      // two layers (incommensurate scale + ~31° rotation) to hide the tiling.
      const applyBlock = lowQuality
        ? "{\n" +
          "  vec2 cuv = vSeafloorWorld.xz * uCausticScale;\n" +
          "  float cc = seafloorCaustic(cuv, uCausticTime);\n" +
          "  gl_FragColor.rgb += uCausticColor * cc * uCausticStrength;\n" +
          "}\n#include <tonemapping_fragment>"
        : "{\n" +
          "  vec2 cuv = vSeafloorWorld.xz * uCausticScale;\n" +
          "  mat2 R = mat2(0.857, -0.515, 0.515, 0.857);\n" +
          "  float c1 = seafloorCaustic(cuv, uCausticTime);\n" +
          "  float c2 = seafloorCaustic(cuv * 1.37 * R + 13.1, uCausticTime * 1.21);\n" +
          "  float cc = (c1 + c2) * 0.5;\n" +
          "  gl_FragColor.rgb += uCausticColor * cc * uCausticStrength;\n" +
          "}\n#include <tonemapping_fragment>";

      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          "#include <common>\nvarying vec3 vSeafloorWorld;\nuniform float uCausticTime;\nuniform float uCausticScale;\nuniform float uCausticStrength;\nuniform vec3 uCausticColor;\n" +
            causticFn(lowQuality ? 3 : 4),
        )
        // Add caustics as linear light just before tonemapping, so they fade
        // naturally with the underwater fog further out.
        .replace("#include <tonemapping_fragment>", applyBlock);
    };

    return mat;
  }, [lowQuality]);

  useFrame((state) => {
    const e = smootherstep(progress.current);
    ref.current.visible = e > 0.001;
    ref.current.scale.setScalar(Math.max(e, 1e-4));
    time.current.value = state.clock.elapsedTime * 0.3; // caustic drift speed
  });

  // Tap the seabed (while playing) to drop an anchor basket at that spot.
  const onPlace = (e: ThreeEvent<PointerEvent>) => {
    const { phase, addBasket } = useGame.getState();
    if (phase !== "playing") return;
    e.stopPropagation();
    addBasket([e.point.x, 0, e.point.z]);
  };

  return (
    <group ref={ref} scale={0} visible={false}>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
        material={material}
        onPointerDown={onPlace}
      >
        <planeGeometry args={[200, 200, 1, 1]} />
      </mesh>
      {children}
    </group>
  );
}
