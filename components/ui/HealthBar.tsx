"use client";

import { useGame } from "@/lib/store";

/**
 * Minimalist environment-health bar (top-centre). Fills 0 → 100% as the meadow
 * is restored, shifting amber → green. Health is driven by the live seagrass
 * count (see the store / gameConfig).
 */
export function HealthBar() {
  const phase = useGame((s) => s.phase);
  const health = useGame((s) => s.health);

  if (phase !== "playing") return null;

  const pct = Math.round(health * 100);
  // amber (low) → green (high)
  const hue = 12 + health * 128;

  return (
    <div className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/30 px-3 py-2 backdrop-blur">
      <span aria-hidden className="text-sm">
        🌱
      </span>
      <div className="h-2 w-20 overflow-hidden rounded-full bg-white/15">
        <div
          className="h-full rounded-full transition-[width,background-color] duration-500"
          style={{ width: `${pct}%`, backgroundColor: `hsl(${hue} 70% 50%)` }}
        />
      </div>
      <span className="w-9 text-right text-xs font-semibold tabular-nums text-[#cfeaf2]">
        {pct}%
      </span>
    </div>
  );
}
