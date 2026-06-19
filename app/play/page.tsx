"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useGame } from "@/lib/store";

// Three.js touches the DOM/WebGL — load the canvas client-side only.
const GameExperience = dynamic(
  () => import("@/components/GameExperience").then((m) => m.GameExperience),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[#04161f] text-[#bfe6ef]">
        Descending…
      </div>
    ),
  }
);

export default function PlayPage() {
  const phase = useGame((s) => s.phase);
  const setPhase = useGame((s) => s.setPhase);
  const setUsername = useGame((s) => s.setUsername);
  const [name, setName] = useState("");

  // Always begin at the personalise step when this page mounts.
  useEffect(() => {
    setPhase("personalise");
  }, [setPhase]);

  function diveIn() {
    setUsername(name.trim() || "Diver");
    setPhase("playing");
  }

  return (
    <main className="relative h-full w-full overflow-hidden bg-[#04161f]">
      <GameExperience />

      <Link
        href="/"
        className="absolute left-4 top-4 z-10 rounded-full bg-black/30 px-4 py-2 text-sm text-[#cfeaf2] backdrop-blur transition active:scale-95"
      >
        ← Surface
      </Link>

      {/* Personalise overlay — drag to rotate, pinch to zoom; fades out on dive */}
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-4 bg-gradient-to-t from-[#04161f] via-[#04161f]/80 to-transparent px-6 pb-10 pt-16 text-center transition-opacity duration-700 ${
          phase === "personalise" ? "opacity-100" : "opacity-0"
        }`}
      >
        <h1 className="text-2xl font-bold text-white sm:text-3xl">
          Make your diver
        </h1>
        <p className="-mt-2 text-xs text-[#9fc4d0]">
          Drag to rotate · pinch to zoom
        </p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && diveIn()}
          placeholder="Name your diver"
          maxLength={20}
          className="pointer-events-auto w-full max-w-xs rounded-full border border-white/20 bg-white/10 px-5 py-3 text-center text-base text-white placeholder-[#9fc4d0] outline-none backdrop-blur focus:border-[#19c6c6]"
        />
        <button
          onClick={diveIn}
          className="pointer-events-auto w-full max-w-xs rounded-full bg-gradient-to-r from-[#19c6c6] to-[#2e7dd1] px-10 py-4 text-lg font-bold text-[#04121f] shadow-lg shadow-cyan-900/40 transition active:scale-95"
        >
          Dive in →
        </button>
      </div>

      {/* Gameplay hint */}
      {phase === "playing" && (
        <p className="absolute inset-x-0 bottom-6 z-10 text-center text-xs text-[#6f97a6]">
          Tap the seafloor to swim.
        </p>
      )}
    </main>
  );
}
