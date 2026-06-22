"use client";

import { useState } from "react";
import { useGame } from "@/lib/store";

/**
 * Emoji emote picker (bottom-left). The game communicates via emoji only, so
 * tapping one shows it floating above the player's diver (see EmoteBubble).
 */

const EMOTES = ["👋", "👍", "❤️", "😄", "🐠", "🌱", "🤿", "✨"];

export function EmoteBar() {
  const phase = useGame((s) => s.phase);
  const setEmote = useGame((s) => s.setEmote);
  const [open, setOpen] = useState(false);

  if (phase !== "playing") return null;

  return (
    <div className="absolute bottom-10 left-7 z-20 flex flex-col items-start gap-2">
      {open && (
        <div className="grid grid-cols-4 gap-1.5 rounded-2xl bg-black/35 p-2 backdrop-blur">
          {EMOTES.map((e) => (
            <button
              key={e}
              onClick={() => {
                setEmote(e);
                setOpen(false);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-2xl transition active:scale-90 hover:bg-white/10"
            >
              {e}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Emote"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-black/35 text-2xl backdrop-blur transition active:scale-90"
      >
        {open ? "✕" : "😀"}
      </button>
    </div>
  );
}
