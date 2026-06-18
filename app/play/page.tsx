"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

// Three.js touches the DOM/WebGL — load the canvas client-side only.
const GameCanvas = dynamic(
  () => import("@/components/GameCanvas").then((m) => m.GameCanvas),
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
  return (
    <main className="relative h-full w-full overflow-hidden bg-[#04161f]">
      <GameCanvas />

      {/* minimal HUD shell — real HUD arrives in P1 */}
      <Link
        href="/"
        className="absolute left-4 top-4 rounded-full bg-black/30 px-4 py-2 text-sm text-[#cfeaf2] backdrop-blur transition active:scale-95"
      >
        ← Surface
      </Link>
    </main>
  );
}
