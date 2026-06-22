"use client";

import Link from "next/link";
import { playSfx, unlockAudio } from "@/lib/audio";

/** Home-screen CTA. Unlocks audio + plays the start SFX on tap; navigation to
 *  /play is client-side, so the sound (and the start BGM) carry over. */
export function StartButton() {
  return (
    <Link
      href="/play"
      onClick={() => {
        unlockAudio();
        playSfx("start");
      }}
      className="relative mt-10 rounded-full bg-gradient-to-r from-[#19c6c6] to-[#2e7dd1] px-10 py-4 text-lg font-bold text-[#04121f] shadow-lg shadow-cyan-900/40 transition active:scale-95"
    >
      Start Play
    </Link>
  );
}
