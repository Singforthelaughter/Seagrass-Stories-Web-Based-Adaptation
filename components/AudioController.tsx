"use client";

import { useEffect } from "react";
import { useGame } from "@/lib/store";
import { useMultiplayer } from "@/lib/multiplayer";
import { fadeInBgm, fadeOutBgm, playSfx, unlockAudio } from "@/lib/audio";

/**
 * Headless audio driver, mounted once in the root layout so it persists across
 * client-side navigation. It:
 *  - unlocks audio on the first user gesture (browser autoplay policy),
 *  - swaps BGM by phase (start screen ↔ gameplay + diver breathing),
 *  - plays SFX when the environment health improves / hits 100%,
 *  - plays the emote SFX for the local player and any remote player.
 *
 * Per-action one-shots that aren't store-driven (dive-in button, basket open,
 * seagrass growing, mini-game) are triggered directly at their sources.
 */
export function AudioController() {
  // Unlock on the first interaction anywhere.
  useEffect(() => {
    const unlock = () => unlockAudio();
    const opts = { once: true } as const;
    window.addEventListener("pointerdown", unlock, opts);
    window.addEventListener("keydown", unlock, opts);
    window.addEventListener("touchstart", unlock, opts);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, []);

  // BGM follows the game phase.
  useEffect(() => {
    const apply = (playing: boolean) => {
      if (playing) {
        fadeOutBgm("startBGM");
        fadeInBgm("gameplayBGM", 0.45);
        fadeInBgm("scubaBreathing", 0.35);
      } else {
        fadeInBgm("startBGM", 0.5);
        fadeOutBgm("gameplayBGM");
        fadeOutBgm("scubaBreathing");
      }
    };
    let playing = useGame.getState().phase === "playing";
    apply(playing);
    return useGame.subscribe((s) => {
      const next = s.phase === "playing";
      if (next !== playing) {
        playing = next;
        apply(next);
      }
    });
  }, []);

  // The per-improvement "environment restored" SFX was removed: it clashed with
  // the basket-open and seagrass-growing sounds. Only the one-time 100%
  // celebration remains, delayed so it lands after those sounds rather than on
  // top of them.
  useEffect(() => {
    const FULL_SFX_DELAY = 2300; // ms after first reaching full health
    let prev = useGame.getState().health;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsub = useGame.subscribe((s) => {
      if (s.health >= 1 && prev < 1) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          playSfx("fullHealth");
          timer = null;
        }, FULL_SFX_DELAY);
      }
      prev = s.health;
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsub();
    };
  }, []);

  // Local player's emote.
  useEffect(() => {
    let prevAt = useGame.getState().emoteAt;
    return useGame.subscribe((s) => {
      if (s.emoteAt !== prevAt) {
        prevAt = s.emoteAt;
        if (s.emote) playSfx("emoji");
      }
    });
  }, []);

  // Remote players' emotes.
  useEffect(() => {
    const seen = new Map<string, number>();
    for (const p of Object.values(useMultiplayer.getState().players)) seen.set(p.id, p.emoteAt);
    return useMultiplayer.subscribe((s) => {
      for (const p of Object.values(s.players)) {
        const last = seen.get(p.id) ?? 0;
        if (p.emote && p.emoteAt > last) playSfx("emoji");
        seen.set(p.id, p.emoteAt);
      }
    });
  }, []);

  return null;
}
