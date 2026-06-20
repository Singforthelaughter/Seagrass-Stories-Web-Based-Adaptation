"use client";

import { useState } from "react";

/**
 * Two tiers only: "full" for anything capable, "low" for weak mobile phones.
 * The goal is NOT to gate devices out — it's to keep low-end phones playable by
 * trimming the most expensive bits (post FX, shadows, caustic iterations, dpr)
 * while every capable device keeps the full look.
 *
 * Heuristic (client-only): be conservative — only flag clearly weak phones, so
 * capable devices are never downgraded. We key off `navigator.deviceMemory`
 * (Chrome/Android; quantised, caps at 8 for flagships) and treat ≤ 2 GB on a
 * mobile UA as low. We deliberately do NOT use `hardwareConcurrency`: iOS Safari
 * under-reports core count, which would false-flag high-end iPhones. Safari also
 * doesn't expose deviceMemory, so iPhones/iPads always get "full". A
 * `?q=low|full` URL override is supported for testing on any device.
 */
export type QualityTier = "low" | "full";

function detectTier(): QualityTier {
  if (typeof window === "undefined" || typeof navigator === "undefined") return "full";

  // Manual override for testing: ?q=low or ?q=full
  const q = new URLSearchParams(window.location.search).get("q");
  if (q === "low" || q === "full") return q;

  const ua = navigator.userAgent;
  const isMobile = /Android|iPhone|iPod|Mobile|Windows Phone/i.test(ua);
  // deviceMemory: Chrome/Android only (undefined on iOS Safari → never low).
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;

  // Only a memory-constrained mobile device counts as low-end.
  if (isMobile && typeof mem === "number" && mem <= 2) return "low";
  return "full";
}

export function useQualityTier(): QualityTier {
  // Component trees that use this are client-only (Canvas is ssr:false), so it's
  // safe to detect synchronously on first render — no SSR/hydration mismatch.
  const [tier] = useState<QualityTier>(detectTier);
  return tier;
}
