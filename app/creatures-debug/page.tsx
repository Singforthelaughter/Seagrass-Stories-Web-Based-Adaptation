"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { CreatureKey, DebugParams } from "@/components/CreatureDebugScene";
import { JUVENILE_FISH, SCAD_FISH, TURTLE, DUGONG } from "@/components/scene/creatures";

const CreatureDebugScene = dynamic(
  () => import("@/components/CreatureDebugScene").then((m) => m.CreatureDebugScene),
  { ssr: false, loading: () => <div className="p-4 text-[#bfe6ef]">Loading…</div> },
);

const DEG = 180 / Math.PI;

const LABELS: Record<CreatureKey, string> = {
  juvenile: "Juvenile (school 1)",
  scad: "Scad (school 2)",
  turtle: "Turtle",
  dugong: "Dugong",
};

// Initial params per creature, seeded from creatures.ts.
function initParams(): Record<CreatureKey, DebugParams> {
  const up = (u?: [number, number, number]) => u ?? [0, 0, 0];
  return {
    juvenile: {
      rx: up(JUVENILE_FISH.upright)[0],
      ry: up(JUVENILE_FISH.upright)[1],
      rz: up(JUVENILE_FISH.upright)[2],
      size: JUVENILE_FISH.targetLen,
      flip: !!JUVENILE_FISH.flip,
    },
    scad: {
      rx: up(SCAD_FISH.upright)[0],
      ry: up(SCAD_FISH.upright)[1],
      rz: up(SCAD_FISH.upright)[2],
      size: SCAD_FISH.targetLen,
      flip: !!SCAD_FISH.flip,
    },
    turtle: { rx: TURTLE.upright[0], ry: TURTLE.upright[1], rz: TURTLE.upright[2], size: TURTLE.targetSize, flip: false },
    dugong: { rx: DUGONG.upright[0], ry: DUGONG.upright[1], rz: DUGONG.upright[2], size: DUGONG.targetSize, flip: false },
  };
}

export default function CreaturesDebugPage() {
  const [selected, setSelected] = useState<CreatureKey>("juvenile");
  const [all, setAll] = useState<Record<CreatureKey, DebugParams>>(initParams);
  const p = all[selected];
  const isFish = selected === "juvenile" || selected === "scad";

  const set = (patch: Partial<DebugParams>) =>
    setAll((s) => ({ ...s, [selected]: { ...s[selected], ...patch } }));

  const r3 = (n: number) => Math.round(n * 1000) / 1000;
  const snippet = isFish
    ? `targetLen: ${r3(p.size)}, flip: ${p.flip}, upright: [${r3(p.rx)}, ${r3(p.ry)}, ${r3(p.rz)}]`
    : `targetSize: ${r3(p.size)}, upright: [${r3(p.rx)}, ${r3(p.ry)}, ${r3(p.rz)}], yawOffset: 0`;

  return (
    <main className="relative h-screen w-full bg-[#0b3547]">
      <div className="absolute inset-0">
        <CreatureDebugScene selected={selected} params={p} />
      </div>

      {/* control panel */}
      <div className="absolute left-3 top-3 z-10 w-72 space-y-3 rounded-xl bg-black/55 p-4 text-sm text-[#dff2f7] backdrop-blur">
        <div className="grid grid-cols-2 gap-1.5">
          {(Object.keys(LABELS) as CreatureKey[]).map((k) => (
            <button
              key={k}
              onClick={() => setSelected(k)}
              className={`rounded-lg px-2 py-1.5 text-xs font-semibold transition ${
                selected === k ? "bg-[#19c6c6] text-[#04121f]" : "bg-white/10 text-[#cfeaf2]"
              }`}
            >
              {LABELS[k]}
            </button>
          ))}
        </div>

        <Slider label="Rotate X" value={p.rx} min={-Math.PI} max={Math.PI} step={0.01}
          onChange={(v) => set({ rx: v })} fmt={(v) => `${Math.round(v * DEG)}°`} />
        <Slider label="Rotate Y" value={p.ry} min={-Math.PI} max={Math.PI} step={0.01}
          onChange={(v) => set({ ry: v })} fmt={(v) => `${Math.round(v * DEG)}°`} />
        <Slider label="Rotate Z" value={p.rz} min={-Math.PI} max={Math.PI} step={0.01}
          onChange={(v) => set({ rz: v })} fmt={(v) => `${Math.round(v * DEG)}°`} />
        <Slider label={isFish ? "Length" : "Size"} value={p.size} min={0.1} max={isFish ? 2 : 6} step={0.05}
          onChange={(v) => set({ size: v })} fmt={(v) => v.toFixed(2)} />

        {isFish && (
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={p.flip} onChange={(e) => set({ flip: e.target.checked })} />
            Flip head ↔ tail
          </label>
        )}

        <button
          onClick={() => set(initParams()[selected])}
          className="w-full rounded-lg bg-white/10 px-2 py-1.5 text-xs"
        >
          Reset to config
        </button>

        <div className="rounded-lg bg-black/40 p-2 text-[11px]">
          <div className="mb-1 text-[#7fb4c2]">Paste into creatures.ts → {LABELS[selected]}:</div>
          <code className="break-words text-[#bdeefc]">{snippet}</code>
        </div>

        <p className="text-[11px] leading-snug text-[#7fb4c2]">
          Rotate until the nose points along the teal +Z arrow and the creature
          sits upright. Drag to orbit · scroll to zoom.
        </p>
      </div>
    </main>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  fmt,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  fmt: (v: number) => string;
}) {
  return (
    <label className="block">
      <div className="mb-0.5 flex justify-between text-xs">
        <span>{label}</span>
        <span className="tabular-nums text-[#9fd0dc]">{fmt(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-[#19c6c6]"
      />
    </label>
  );
}
