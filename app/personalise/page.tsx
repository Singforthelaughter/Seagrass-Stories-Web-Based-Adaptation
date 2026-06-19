"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useGame } from "@/lib/store";

// Three.js touches WebGL — load the preview client-side only.
const PersonalizeCanvas = dynamic(
  () => import("@/components/PersonalizeCanvas").then((m) => m.PersonalizeCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-[#0e5a72] text-[#dff4ff]">
        Loading your diver…
      </div>
    ),
  }
);

export default function PersonalisePage() {
  const router = useRouter();
  const setUsername = useGame((s) => s.setUsername);
  const [name, setName] = useState("");

  function diveIn() {
    setUsername(name.trim() || "Diver");
    router.push("/play");
  }

  return (
    <main className="relative h-full w-full overflow-hidden bg-[#0e5a72]">
      {/* floating diver preview fills the screen */}
      <div className="absolute inset-0">
        <PersonalizeCanvas />
      </div>

      <Link
        href="/"
        className="absolute left-4 top-4 z-10 rounded-full bg-black/30 px-4 py-2 text-sm text-[#cfeaf2] backdrop-blur transition active:scale-95"
      >
        ← Surface
      </Link>

      {/* bottom panel: name your diver + dive in */}
      <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-4 bg-gradient-to-t from-[#04161f] via-[#04161f]/80 to-transparent px-6 pb-10 pt-16 text-center">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">
          Make your diver
        </h1>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && diveIn()}
          placeholder="Name your diver"
          maxLength={20}
          className="w-full max-w-xs rounded-full border border-white/20 bg-white/10 px-5 py-3 text-center text-base text-white placeholder-[#9fc4d0] outline-none backdrop-blur focus:border-[#19c6c6]"
        />
        <button
          onClick={diveIn}
          className="w-full max-w-xs rounded-full bg-gradient-to-r from-[#19c6c6] to-[#2e7dd1] px-10 py-4 text-lg font-bold text-[#04121f] shadow-lg shadow-cyan-900/40 transition active:scale-95"
        >
          Dive in →
        </button>
      </div>
    </main>
  );
}
