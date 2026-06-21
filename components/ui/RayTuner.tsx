"use client";

import { useEffect, useState } from "react";
import { useGame } from "@/lib/store";
import type { RayParams } from "@/lib/store";

/**
 * Temporary dev panel to tune the sun rays. Only shows when the URL has ?tune.
 * Dial in the values, read them off, then bake into the store defaults and
 * remove this component.
 */
const SLIDERS: { key: keyof RayParams; label: string; min: number; max: number; step: number }[] = [
  { key: "count", label: "Count", min: 1, max: 200, step: 1 },
  { key: "length", label: "Length", min: 10, max: 220, step: 5 },
  { key: "radius", label: "Radius (thickness)", min: 0.1, max: 10, step: 0.1 },
  { key: "intensity", label: "Intensity", min: 0, max: 4, step: 0.05 },
  { key: "power", label: "Fresnel power", min: 0.3, max: 8, step: 0.1 },
  { key: "tilt", label: "Tilt°", min: 0, max: 45, step: 1 },
  { key: "spread", label: "Spread", min: 2, max: 140, step: 2 },
  { key: "centerY", label: "Center Y", min: -10, max: 40, step: 1 },
  { key: "speed", label: "Drift speed", min: 0, max: 3, step: 0.05 },
  { key: "fadeSpeed", label: "Fade speed", min: 0, max: 3, step: 0.05 },
];

export function RayTuner({ forceShow = false }: { forceShow?: boolean }) {
  const [show, setShow] = useState(false);
  const rays = useGame((s) => s.rays);
  const setRays = useGame((s) => s.setRays);

  useEffect(() => {
    setShow(forceShow || new URLSearchParams(window.location.search).has("tune"));
  }, [forceShow]);

  if (!show) return null;

  return (
    <div className="absolute right-3 top-16 z-40 w-60 rounded-xl border border-white/15 bg-black/70 p-3 text-xs text-white backdrop-blur">
      <div className="mb-2 font-bold">Sun rays (temp)</div>
      {SLIDERS.map(({ key, label, min, max, step }) => (
        <label key={key} className="mb-2 block">
          <div className="flex justify-between text-[#9fc4d0]">
            <span>{label}</span>
            <span>{rays[key]}</span>
          </div>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={rays[key]}
            onChange={(e) => setRays({ [key]: parseFloat(e.target.value) })}
            className="w-full"
          />
        </label>
      ))}
      <button
        onClick={() => navigator.clipboard?.writeText(JSON.stringify(rays))}
        className="mt-1 w-full rounded bg-white/15 py-1 active:scale-95"
      >
        Copy values
      </button>
    </div>
  );
}
