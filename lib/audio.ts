"use client";

/**
 * Lightweight game audio manager (singleton, lives at module scope so it
 * survives client-side route changes).
 *
 *  - One-shot SFX: `playSfx(name)` — cloned per play so they can overlap.
 *  - Looped BGM:   `fadeInBgm(name, vol)` / `fadeOutBgm(name)` — volume is
 *    ramped over FADE_MS for smooth cross-fades.
 *
 * Browsers block audio until the user interacts with the page, so nothing is
 * audible until `unlockAudio()` is called from a real user gesture (wired up in
 * <AudioController>). Calls made before then are remembered (BGM targets) and
 * started on unlock.
 */

const BASE = "/SFX";

/** One-shot sound effects → file + default volume. */
const SFX = {
  basketOpen: { src: `${BASE}/basketOpenSFX.mp3`, vol: 0.8 },
  diveIn: { src: `${BASE}/diveInSFX.mp3`, vol: 0.9 },
  emoji: { src: `${BASE}/emojiSFX.mp3`, vol: 0.7 },
  healthRestored: { src: `${BASE}/environmentHealthRestoredSFX.mp3`, vol: 0.8 },
  fullHealth: { src: `${BASE}/fullHealthSFX.mp3`, vol: 0.95 },
  miniGameHit: { src: `${BASE}/MiniGameHitSFX.wav`, vol: 0.8 },
  miniGameJump: { src: `${BASE}/MiniGameJumpSFX.mp3`, vol: 0.6 },
  seaGrassGrowing: { src: `${BASE}/seaGrassGrowingSFX.mp3`, vol: 0.8 },
  start: { src: `${BASE}/StartSFX.mp3`, vol: 0.3 },
} as const;

/** Looped background tracks. */
const BGM = {
  startBGM: `${BASE}/startBGM.mp3`,
  gameplayBGM: `${BASE}/gameplayBGM.mp3`,
  scubaBreathing: `${BASE}/scubaBreathingBGM.mp3`,
} as const;

export type SfxName = keyof typeof SFX;
export type BgmName = keyof typeof BGM;

const FADE_MS = 1200;
const VOLUME_KEY = "sg_volume";

let unlocked = false;

// Master volume (0–1), persisted, applied on top of every per-sound level.
let master = 1;
if (typeof window !== "undefined") {
  const saved = parseFloat(localStorage.getItem(VOLUME_KEY) ?? "");
  if (Number.isFinite(saved)) master = Math.max(0, Math.min(1, saved));
}

const volumeListeners = new Set<(v: number) => void>();

// Cache one "template" element per SFX; clone it for each (overlapping) play.
const sfxTemplates = new Map<SfxName, HTMLAudioElement>();

/** A looped track: `fade` (0–1) is the current cross-fade level, `base` is the
 *  requested level for this track; element volume = fade × base × master. */
type Track = { el: HTMLAudioElement; base: number; fade: number; target: number; raf: number | null };
const bgmTracks = new Map<BgmName, Track>();

function makeEl(src: string) {
  const a = new Audio(src);
  a.preload = "auto";
  return a;
}

function applyTrackVolume(t: Track) {
  t.el.volume = Math.max(0, Math.min(1, t.fade * t.base * master));
}

/** Call from a user gesture to satisfy the browser autoplay policy. Starts any
 *  BGM that was requested before the page was interactive. */
export function unlockAudio() {
  if (unlocked) return;
  unlocked = true;
  for (const t of bgmTracks.values()) {
    if (t.target > 0 && master > 0) t.el.play().catch(() => {});
  }
}

export function getMasterVolume() {
  return master;
}

/** Set the master volume (0–1); persists and updates everything live. */
export function setMasterVolume(value: number) {
  master = Math.max(0, Math.min(1, value));
  if (typeof window !== "undefined") localStorage.setItem(VOLUME_KEY, String(master));
  for (const t of bgmTracks.values()) {
    applyTrackVolume(t);
    if (master <= 0) t.el.pause();
    else if (t.target > 0 && unlocked && t.el.paused) t.el.play().catch(() => {});
  }
  for (const fn of volumeListeners) fn(master);
}

/** Subscribe to master-volume changes (for UI). Returns an unsubscribe fn. */
export function onVolumeChange(fn: (v: number) => void) {
  volumeListeners.add(fn);
  return () => {
    volumeListeners.delete(fn);
  };
}

export function playSfx(name: SfxName) {
  if (!unlocked || master <= 0) return;
  const def = SFX[name];
  let tpl = sfxTemplates.get(name);
  if (!tpl) {
    tpl = makeEl(def.src);
    sfxTemplates.set(name, tpl);
  }
  const node = tpl.cloneNode(true) as HTMLAudioElement;
  node.volume = Math.max(0, Math.min(1, def.vol * master));
  node.play().catch(() => {});
}

function getTrack(name: BgmName): Track {
  let t = bgmTracks.get(name);
  if (!t) {
    const el = makeEl(BGM[name]);
    el.loop = true;
    el.volume = 0;
    t = { el, base: 1, fade: 0, target: 0, raf: null };
    bgmTracks.set(name, t);
  }
  return t;
}

function ramp(t: Track) {
  if (t.raf !== null) cancelAnimationFrame(t.raf);
  let last = performance.now();
  const step = (now: number) => {
    const dt = now - last;
    last = now;
    const dir = Math.sign(t.target - t.fade);
    const next = t.fade + dir * (dt / FADE_MS);
    t.fade = dir > 0 ? Math.min(next, t.target) : Math.max(next, t.target);
    applyTrackVolume(t);
    if (t.fade !== t.target) {
      t.raf = requestAnimationFrame(step);
    } else {
      t.raf = null;
      if (t.target === 0) t.el.pause();
    }
  };
  t.raf = requestAnimationFrame(step);
}

/** Fade a looped track in to `vol` (and start it if unlocked). */
export function fadeInBgm(name: BgmName, vol = 1) {
  const t = getTrack(name);
  t.base = vol;
  t.target = 1;
  if (unlocked && master > 0) t.el.play().catch(() => {});
  ramp(t);
}

/** Fade a looped track out (pauses once silent). */
export function fadeOutBgm(name: BgmName) {
  const t = bgmTracks.get(name);
  if (!t) return;
  t.target = 0;
  ramp(t);
}
