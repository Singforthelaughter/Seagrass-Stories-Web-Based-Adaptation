import { create } from "zustand";
import * as THREE from "three";

export type Vec3 = [number, number, number];

/** Sun-ray tuning parameters (cylinder-particle system). */
export type RayParams = {
  count: number; // number of ray cylinders
  length: number; // cylinder length
  radius: number; // cylinder radius (ray thickness)
  intensity: number; // overall brightness
  power: number; // fresnel exponent (inner-white → outer-transparent falloff)
  tilt: number; // lean from vertical, degrees
  spread: number; // XZ distribution radius
  centerY: number; // vertical centre of the shafts
  speed: number; // slow drift/rotation speed
  fadeSpeed: number; // per-ray fade in/out rate (0 = no fade)
};

/** "personalise" = inspecting the diver up close; "playing" = in the meadow. */
export type Phase = "personalise" | "playing";

interface GameState {
  /** Current stage of the single shared 3D experience. */
  phase: Phase;
  setPhase: (p: Phase) => void;
  /**
   * Stable, unique player id = the Supabase anonymous auth uid (persisted across
   * reloads). Used to identify the player consistently; there is no username.
   */
  playerId: string | null;
  setPlayerId: (id: string | null) => void;
  /** AI-generated wetsuit (M_Suit) texture, as a data URL. null = plain white. */
  suitTextureUrl: string | null;
  setSuitTextureUrl: (url: string | null) => void;
  /**
   * Previously generated wetsuit textures (most recent first), as data URLs.
   * In-memory for now; will be backed by Supabase Storage / diver_textures (P2/P4).
   */
  suitTextureHistory: string[];
  addSuitTexture: (url: string) => void;
  /** Replace the whole history (e.g. after loading from Supabase). */
  setSuitHistory: (urls: string[]) => void;
  /**
   * Joystick movement input, each axis in [-1, 1]. x = world X, y = world Z
   * (screen-up is negative = swim away from the camera). [0,0] = idle.
   */
  move: [number, number];
  setMove: (x: number, y: number) => void;
  /**
   * Ecosystem health, 0 (barren) → 1 (thriving). The meadow starts damaged, so
   * it begins low. Marine life (e.g. the fish school) only appears once health
   * crosses its threshold. Will be driven by the world sim (P2) later.
   */
  health: number;
  setHealth: (h: number) => void;
  /** Tunable sun-ray params (temporary dev sliders, gated behind ?tune). */
  rays: RayParams;
  setRays: (p: Partial<RayParams>) => void;
  /**
   * The diver's live world position, mutated in place each frame (no re-render).
   * Read by other systems (e.g. the fish school) that need to avoid the diver.
   */
  diverPos: THREE.Vector3;
}

export const useGame = create<GameState>((set) => ({
  phase: "personalise",
  setPhase: (p) => set({ phase: p }),
  playerId: null,
  setPlayerId: (id) => set({ playerId: id }),
  suitTextureUrl: null,
  setSuitTextureUrl: (url) => set({ suitTextureUrl: url }),
  suitTextureHistory: [],
  addSuitTexture: (url) =>
    set((s) => ({
      suitTextureUrl: url,
      suitTextureHistory: [url, ...s.suitTextureHistory.filter((u) => u !== url)].slice(0, 12),
    })),
  setSuitHistory: (urls) => set({ suitTextureHistory: urls }),
  move: [0, 0],
  setMove: (x, y) => set({ move: [x, y] }),
  diverPos: new THREE.Vector3(),
  health: 0,
  setHealth: (h) => set({ health: Math.max(0, Math.min(1, h)) }),
  rays: {
    count: 85,
    length: 115,
    radius: 2,
    intensity: 1.95,
    power: 4,
    tilt: 8,
    spread: 34,
    centerY: 12,
    speed: 0.05,
    fadeSpeed: 0.5,
  },
  setRays: (p) => set((s) => ({ rays: { ...s.rays, ...p } })),
}));
