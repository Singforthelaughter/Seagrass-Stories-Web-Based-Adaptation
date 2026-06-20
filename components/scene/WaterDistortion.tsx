"use client";

import { forwardRef, useMemo } from "react";
import { Effect } from "postprocessing";
import { Uniform } from "three";
import type { WebGLRenderer, WebGLRenderTarget } from "three";

/**
 * A subtle, full-screen "looking through water" wobble. It's a UV-domain
 * post-effect (mainUv), so it warps the whole rendered 3D scene — diver, water
 * background, seafloor, seagrass, and anything added later — uniformly.
 *
 * It lives inside the WebGL Canvas, so it has no effect on the HTML UI overlay
 * (joystick, personalise panel, buttons), which is composited separately by the
 * browser on top of the canvas.
 *
 * Two layered sine/cosine waves at slightly different rates keep the motion
 * organic rather than a single obvious ripple. Amplitude is intentionally tiny.
 */
const fragment = /* glsl */ `
uniform float uTime;
uniform float uAmplitude;
uniform float uFrequency;
uniform float uSpeed;

void mainUv(inout vec2 uv) {
  float t = uTime * uSpeed;
  // primary slow swell
  uv.x += sin(uv.y * uFrequency + t) * uAmplitude;
  uv.y += cos(uv.x * uFrequency + t * 0.9) * uAmplitude;
  // finer secondary ripple for a little life
  uv.x += sin(uv.y * uFrequency * 2.3 - t * 1.7) * uAmplitude * 0.4;
}
`;

type WaterDistortionOptions = {
  amplitude?: number;
  frequency?: number;
  speed?: number;
};

class WaterDistortionEffect extends Effect {
  constructor({ amplitude = 0.0025, frequency = 9, speed = 0.6 }: WaterDistortionOptions = {}) {
    super("WaterDistortionEffect", fragment, {
      uniforms: new Map<string, Uniform<number>>([
        ["uTime", new Uniform(0)],
        ["uAmplitude", new Uniform(amplitude)],
        ["uFrequency", new Uniform(frequency)],
        ["uSpeed", new Uniform(speed)],
      ]),
    });
  }

  update(_renderer: WebGLRenderer, _input: WebGLRenderTarget, deltaTime: number) {
    const time = this.uniforms.get("uTime") as Uniform<number> | undefined;
    if (time) time.value += deltaTime;
  }
}

/** Declarative wrapper for use inside <EffectComposer>. */
export const WaterDistortion = forwardRef<Effect, WaterDistortionOptions>(
  function WaterDistortion({ amplitude = 0.0025, frequency = 9, speed = 0.6 }, ref) {
    const effect = useMemo(
      () => new WaterDistortionEffect({ amplitude, frequency, speed }),
      [amplitude, frequency, speed],
    );
    return <primitive ref={ref} object={effect} dispose={null} />;
  },
);
