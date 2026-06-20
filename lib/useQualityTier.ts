"use client";

import { useState } from "react";

/**
 * Two tiers only: "full" for anything capable, "low" for weak mobile phones.
 * The goal is NOT to gate devices out — it's to keep low-end phones playable by
 * trimming the most expensive bits (post FX, shadows, caustic iterations, dpr)
 * while every capable device keeps the full look.
 *
 * Heuristic (client-only): a device is "low" only if it's a phone AND reports
 * few CPU cores or little memory. Desktops and tablets (incl. iPad, which UAs
 * as desktop on modern iOS) always get "full". A `?q=low|full` URL override is
 * supported for testing on any device.
 */
export type QualityTier = "low" | "full";

function detectTier(): QualityTier {
  if (typeof window === "undefined" || typeof navigator === "undefined") return "full";

  // Manual override for testing: ?q=low or ?q=full
  const q = new URLSearchParams(window.location.search).get("q");
  if (q === "low" || q === "full") return q;

  const ua = navigator.userAgent;
  const isPhone = /Android.+Mobile|iPhone|iPod|Windows Phone/i.test(ua);
  if (!isPhone) return "full"; // desktop + tablets → full

  const cores = navigator.hardwareConcurrency ?? 8;
  // deviceMemory is Chrome-only (undefined on iOS Safari); treat unknown as ok.
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const lowMem = typeof mem === "number" && mem <= 4;
  const lowCores = cores <= 4;

  return lowMem || lowCores ? "low" : "full";
}

export function useQualityTier(): QualityTier {
  // Component trees that use this are client-only (Canvas is ssr:false), so it's
  // safe to detect synchronously on first render — no SSR/hydration mismatch.
  const [tier] = useState<QualityTier>(detectTier);
  return tier;
}
