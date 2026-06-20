"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { RayTuner } from "@/components/ui/RayTuner";

// WebGL canvas — client-only.
const RaysDebugScene = dynamic(
  () => import("@/components/RaysDebugScene").then((m) => m.RaysDebugScene),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center bg-[#04161f] text-[#bfe6ef]">
        Loading…
      </div>
    ),
  }
);

export default function RaysDebugPage() {
  return (
    <main className="relative h-full w-full overflow-hidden bg-[#04161f]">
      <RaysDebugScene />

      <Link
        href="/play"
        className="absolute left-4 top-4 z-10 rounded-full bg-black/30 px-4 py-2 text-sm text-[#cfeaf2] backdrop-blur transition active:scale-95"
      >
        ← Back to game
      </Link>

      <div className="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full bg-black/30 px-4 py-2 text-xs text-[#9fc4d0] backdrop-blur">
        Sun-ray debug · drag to orbit · adjust with the sliders →
      </div>

      {/* Always-visible tuner here */}
      <RayTuner forceShow />
    </main>
  );
}
