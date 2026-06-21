"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useGame } from "@/lib/store";
import { ensureSession, getAccessToken, loadTextureHistory } from "@/lib/player";
import { Joystick } from "@/components/ui/Joystick";
import { RayTuner } from "@/components/ui/RayTuner";
import { BasketHUD } from "@/components/ui/BasketHUD";
import { HealthBar } from "@/components/ui/HealthBar";

// Three.js touches the DOM/WebGL — load the canvas client-side only.
const GameExperience = dynamic(
  () => import("@/components/GameExperience").then((m) => m.GameExperience),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#04161f] text-[#bfe6ef]">
        Descending…
      </div>
    ),
  }
);

export default function PlayPage() {
  const phase = useGame((s) => s.phase);
  const setPhase = useGame((s) => s.setPhase);
  const firstBasketPlaced = useGame((s) => s.firstBasketPlaced);
  const setSuitTextureUrl = useGame((s) => s.setSuitTextureUrl);
  const suitTextureUrl = useGame((s) => s.suitTextureUrl);
  const addSuitTexture = useGame((s) => s.addSuitTexture);
  const setSuitHistory = useGame((s) => s.setSuitHistory);
  const suitTextureHistory = useGame((s) => s.suitTextureHistory);
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDesigns, setShowDesigns] = useState(false);

  // Begin at the personalise step. Sign in anonymously (this gives each player a
  // stable, unique id — no username needed) and load any saved wetsuit designs.
  useEffect(() => {
    setPhase("personalise");
    (async () => {
      await ensureSession();
      const history = await loadTextureHistory();
      if (history.length) setSuitHistory(history);
    })();
  }, [setPhase, setSuitHistory]);

  async function generate() {
    const p = prompt.trim();
    if (!p || generating) return;
    setGenerating(true);
    setError(null);
    try {
      const token = await getAccessToken();
      const res = await fetch("/api/generate-texture", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ prompt: p }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed.");
      // Prefer the durable Supabase URL; fall back to the inline data URL.
      addSuitTexture(data.url ?? data.image);
      const history = await loadTextureHistory();
      if (history.length) setSuitHistory(history);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setGenerating(false);
    }
  }

  function diveIn() {
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

      {/* Top-right: open the saved designs gallery */}
      {phase === "personalise" && (
        <button
          onClick={() => setShowDesigns(true)}
          className="absolute right-4 top-4 z-10 flex items-center gap-1.5 rounded-full bg-black/30 px-4 py-2 text-sm text-[#cfeaf2] backdrop-blur transition active:scale-95"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
          Designs
          {suitTextureHistory.length > 0 && (
            <span className="rounded-full bg-[#19c6c6] px-1.5 text-xs font-bold text-[#04121f]">
              {suitTextureHistory.length}
            </span>
          )}
        </button>
      )}

      {/* Saved designs popup */}
      {showDesigns && (
        <div
          className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
          onClick={() => setShowDesigns(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#0a2230] p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Your designs</h2>
              <button
                onClick={() => setShowDesigns(false)}
                className="rounded-full bg-white/10 px-3 py-1 text-sm text-[#cfeaf2] active:scale-95"
              >
                Close
              </button>
            </div>
            {suitTextureHistory.length === 0 ? (
              <p className="py-8 text-center text-sm text-[#7fa3b0]">
                No designs yet — generate a wetsuit and it will be saved here.
              </p>
            ) : (
              <div className="grid max-h-[50vh] grid-cols-3 gap-3 overflow-y-auto">
                {suitTextureHistory.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setSuitTextureUrl(url);
                      setShowDesigns(false);
                    }}
                    className={`aspect-square overflow-hidden rounded-lg border-2 transition active:scale-95 ${
                      url === suitTextureUrl ? "border-[#19c6c6]" : "border-white/15"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Design ${i + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Personalise overlay — drag to rotate, pinch to zoom; fades out on dive */}
      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-3 bg-gradient-to-t from-[#04161f] via-[#04161f]/85 to-transparent px-5 pb-8 pt-16 transition-opacity duration-700 ${
          phase === "personalise" ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="w-full max-w-sm text-center">
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Design your diver</h1>
          <p className="mt-1 text-xs text-[#9fc4d0]">Drag to rotate · pinch to zoom</p>
        </div>

        {/* Design the wetsuit with AI */}
        <div
          className={`w-full max-w-sm ${
            phase === "personalise" ? "pointer-events-auto" : "pointer-events-none"
          }`}
        >
          <label className="mb-1.5 block text-sm font-semibold text-white">
            🎨 Design your wetsuit
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. coral reef camouflage, deep-sea bioluminescence, neon tiger stripes…"
            maxLength={120}
            rows={2}
            disabled={generating}
            className="w-full resize-none rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-base text-white placeholder-[#7fa3b0] outline-none backdrop-blur focus:border-[#19c6c6] disabled:opacity-60"
          />
          <button
            onClick={generate}
            disabled={generating || !prompt.trim()}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-white/15 py-3 text-base font-semibold text-white backdrop-blur transition active:scale-[0.98] disabled:opacity-40"
          >
            {generating ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Designing… (~20s)
              </>
            ) : suitTextureUrl ? (
              "Regenerate ↻"
            ) : (
              "✨ Generate"
            )}
          </button>
          <div className="mt-1.5 flex min-h-4 items-center justify-between text-xs">
            <span className="text-rose-300">{error}</span>
            {suitTextureUrl && !generating && (
              <button
                onClick={() => setSuitTextureUrl(null)}
                className="text-[#9fc4d0] underline underline-offset-2"
              >
                Reset to plain suit
              </button>
            )}
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={diveIn}
          className={`mt-1 w-full max-w-sm rounded-full bg-gradient-to-r from-[#19c6c6] to-[#2e7dd1] py-4 text-lg font-bold text-[#04121f] shadow-lg shadow-cyan-900/40 transition active:scale-[0.98] ${
            phase === "personalise" ? "pointer-events-auto" : "pointer-events-none"
          }`}
        >
          Dive in →
        </button>
      </div>

      {/* Gameplay controls */}
      {phase === "playing" && <Joystick />}

      {/* Environment health (top-centre) + basket batch / cooldown HUD (corner) */}
      <HealthBar />
      <BasketHUD />

      {/* First-time hint: tap the seafloor to plant. Fades out after the first
          basket is placed. */}
      <div
        className={`pointer-events-none absolute inset-x-0 top-24 z-10 flex justify-center transition-opacity duration-500 ${
          phase === "playing" && !firstBasketPlaced ? "opacity-100" : "opacity-0"
        }`}
      >
        <span className="rounded-full bg-black/35 px-4 py-2 text-sm font-medium text-[#cfeaf2] backdrop-blur">
          👆 Tap the seafloor to plant seagrass
        </span>
      </div>

      {/* Temporary sun-ray tuning sliders (only with ?tune in the URL) */}
      <RayTuner />
    </main>
  );
}
