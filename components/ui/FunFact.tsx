"use client";

import { useEffect, useRef, useState } from "react";
import { useGame } from "@/lib/store";
import { SEAGRASS_FUN_FACTS } from "@/lib/funFacts";

/**
 * Flashes a short seagrass fun-fact (top-centre, under the health bar) each time
 * the environment health improves — turning every bit of progress into a little
 * "did you know?". Improvements are debounced so a quick batch of baskets shows
 * one fact, and facts cycle through a shuffled order so they don't repeat.
 */

const DISPLAY_MS = 6500; // how long each fact stays up
const DEBOUNCE_MS = 1200; // collapse a burst of improvements into one fact

export function FunFact() {
  const [fact, setFact] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const order = useRef<number[]>([]);
  const ptr = useRef(0);

  // Shuffle the fact order once so the sequence feels fresh each session.
  useEffect(() => {
    const idx = SEAGRASS_FUN_FACTS.map((_, i) => i);
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    order.current = idx;
  }, []);

  useEffect(() => {
    const pickNext = () => {
      const o = order.current;
      const fIdx = o.length ? o[ptr.current % o.length] : 0;
      ptr.current += 1;
      return SEAGRASS_FUN_FACTS[fIdx];
    };

    let prev = useGame.getState().health;
    let debounce: ReturnType<typeof setTimeout> | null = null;
    let hide: ReturnType<typeof setTimeout> | null = null;

    const unsub = useGame.subscribe((s) => {
      // Only while actually playing, and only when health goes up.
      if (s.phase === "playing" && s.health > prev) {
        if (debounce) clearTimeout(debounce);
        debounce = setTimeout(() => {
          setFact(pickNext());
          setShow(true);
          if (hide) clearTimeout(hide);
          hide = setTimeout(() => setShow(false), DISPLAY_MS);
        }, DEBOUNCE_MS);
      }
      prev = s.health;
    });

    return () => {
      unsub();
      if (debounce) clearTimeout(debounce);
      if (hide) clearTimeout(hide);
    };
  }, []);

  if (!fact) return null;

  return (
    <div
      className={`pointer-events-none fixed left-1/2 top-16 z-30 w-[min(92vw,420px)] -translate-x-1/2 transition-all duration-500 ${
        show ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
      }`}
    >
      <div className="rounded-2xl border border-[#19c6c6]/40 bg-[#06222e]/85 px-4 py-3 text-center shadow-lg shadow-cyan-950/40 backdrop-blur">
        <div className="mb-0.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#19c6c6]">
          Sea fact
        </div>
        <p className="text-sm leading-snug text-[#eaf7fb]">{fact}</p>
      </div>
    </div>
  );
}
