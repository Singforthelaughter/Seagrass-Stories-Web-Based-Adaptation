"use client";

import { useEffect, useState } from "react";
import { useGame } from "@/lib/store";
import { BASKET_BATCH } from "@/lib/gameConfig";

/**
 * Minimalist corner HUD for the basket batch: shows how many baskets are left to
 * place, or a countdown while the batch is on cooldown. Also drives the refill
 * tick (the store only refills when poked).
 */
export function BasketHUD() {
  const phase = useGame((s) => s.phase);
  const basketsLeft = useGame((s) => s.basketsLeft);
  const cooldownUntil = useGame((s) => s.basketCooldownUntil);
  const refill = useGame((s) => s.refillBaskets);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => {
      refill();
      setNow(Date.now());
    }, 200);
    return () => clearInterval(t);
  }, [refill]);

  if (phase !== "playing") return null;

  const cooling = cooldownUntil > 0 && now < cooldownUntil;
  const secsLeft = cooling ? Math.ceil((cooldownUntil - now) / 1000) : 0;

  return (
    <div className="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-full bg-black/30 px-3 py-2 text-sm text-[#cfeaf2] backdrop-blur">
      <span aria-hidden>🧺</span>
      {cooling ? (
        <span className="font-semibold tabular-nums">{secsLeft}s</span>
      ) : (
        <span className="flex gap-1">
          {Array.from({ length: BASKET_BATCH }).map((_, i) => (
            <span
              key={i}
              className={`h-2 w-2 rounded-full transition-colors ${
                i < basketsLeft ? "bg-[#19c6c6]" : "bg-white/25"
              }`}
            />
          ))}
        </span>
      )}
    </div>
  );
}
