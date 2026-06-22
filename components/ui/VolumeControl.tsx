"use client";

import { useEffect, useRef, useState } from "react";
import { getMasterVolume, onVolumeChange, setMasterVolume, unlockAudio } from "@/lib/audio";

/**
 * Minimal master-volume control (bottom-right). Just a speaker button by
 * default; tapping it reveals a slim slider, which collapses again when you tap
 * the button or click away. The button icon reflects the current level.
 */
export function VolumeControl() {
  const [open, setOpen] = useState(false);
  const [vol, setVol] = useState(1);
  const ref = useRef<HTMLDivElement>(null);

  // Reflect the persisted/initial volume and stay in sync with changes.
  useEffect(() => {
    setVol(getMasterVolume());
    return onVolumeChange(setVol);
  }, []);

  // Collapse the slider when tapping outside.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open]);

  const icon = vol <= 0 ? "🔇" : vol < 0.5 ? "🔉" : "🔊";

  return (
    <div ref={ref} className="fixed bottom-6 right-5 z-50 flex items-center gap-2">
      {open && (
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={vol}
          onChange={(e) => {
            unlockAudio();
            setMasterVolume(parseFloat(e.target.value));
          }}
          aria-label="Volume"
          className="h-1.5 w-28 cursor-pointer appearance-none rounded-full bg-white/25 accent-[#19c6c6]"
        />
      )}
      <button
        onClick={() => {
          unlockAudio();
          setOpen((o) => !o);
        }}
        aria-label="Volume"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-black/35 text-lg backdrop-blur transition active:scale-90"
      >
        {icon}
      </button>
    </div>
  );
}
