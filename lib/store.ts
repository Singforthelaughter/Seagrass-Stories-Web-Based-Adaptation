import { create } from "zustand";
import * as THREE from "three";
import {
  BASKET_BATCH,
  BASKET_COOLDOWN,
  STARTING_SEAGRASS,
  SEAGRASS_PER_BASKET,
  SEAGRASS_FOR_FULL,
} from "@/lib/gameConfig";

/** Environment health (0–1) from the live seagrass count: the starting meadow
 *  plus the grass grown around every currently-placed basket. */
const healthFor = (numBaskets: number) =>
  Math.max(
    0,
    Math.min(1, (STARTING_SEAGRASS + numBaskets * SEAGRASS_PER_BASKET) / SEAGRASS_FOR_FULL),
  );

export type Vec3 = [number, number, number];

/** A placed anchor basket. `createdAt` (ms epoch) drives the shared drop / open
 *  / lifetime animation so it's consistent across clients; `playerId` is the
 *  owner (only the owner removes it from the shared world at end of life). */
export type PlacedBasket = {
  id: string;
  pos: Vec3;
  createdAt: number;
  playerId: string | null;
};

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
  /** Emoji emote the player is currently showing above their diver (null = none). */
  emote: string | null;
  /** Timestamp (ms) the current emote was triggered (re-triggers the pop anim). */
  emoteAt: number;
  setEmote: (e: string | null) => void;
  /** Anchor baskets the player has placed on the seafloor. */
  baskets: PlacedBasket[];
  /** Baskets still placeable in the current batch (refills after a cooldown). */
  basketsLeft: number;
  /** Timestamp (ms) the placement cooldown ends; 0 = not cooling down. */
  basketCooldownUntil: number;
  /** Whether the player has placed their first basket (hides the tap hint). */
  firstBasketPlaced: boolean;
  /** Spend one basket from the batch (budget + cooldown gate). Returns whether
   *  the placement is allowed. Actual basket creation is handled by the caller
   *  (DB insert in multiplayer, or addLocalBasket offline). */
  tryConsumeBasket: () => boolean;
  /** Add a basket locally (offline / single-player fallback). */
  addLocalBasket: (pos: Vec3) => void;
  /** Replace the whole basket list (e.g. from the realtime world sync). */
  setBaskets: (baskets: PlacedBasket[]) => void;
  /** Remove a basket once it has lived out its lifetime + fade. */
  removeBasket: (id: string) => void;
  /** Refill the batch if the cooldown has elapsed (called by the HUD ticker). */
  refillBaskets: () => void;
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
  /** The diver's live HEAD world position (mutated in place by the Diver each
   *  frame). Used to anchor the emote speech bubble to the head. */
  diverHeadPos: THREE.Vector3;
  /** The diver's horizontal forward (facing) direction, mutated in place each
   *  frame. Used to offset the emote bubble in front of the face. */
  diverForward: THREE.Vector3;
}

export const useGame = create<GameState>((set, get) => ({
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
  emote: null,
  emoteAt: 0,
  setEmote: (e) => set({ emote: e, emoteAt: Date.now() }),
  baskets: [],
  basketsLeft: BASKET_BATCH,
  basketCooldownUntil: 0,
  firstBasketPlaced: false,
  tryConsumeBasket: () => {
    const s = get();
    const now = Date.now();
    // Reject while cooling down or once the batch is spent.
    if (s.basketCooldownUntil && now < s.basketCooldownUntil) return false;
    if (s.basketsLeft <= 0) return false;
    const left = s.basketsLeft - 1;
    set({
      basketsLeft: left,
      firstBasketPlaced: true,
      // Spending the last basket of the batch starts the cooldown.
      basketCooldownUntil: left === 0 ? now + BASKET_COOLDOWN * 1000 : s.basketCooldownUntil,
    });
    return true;
  },
  addLocalBasket: (pos) =>
    set((s) => {
      const baskets = [
        ...s.baskets,
        { id: crypto.randomUUID(), pos, createdAt: Date.now(), playerId: s.playerId },
      ];
      return { baskets, health: healthFor(baskets.length) };
    }),
  setBaskets: (baskets) => set({ baskets, health: healthFor(baskets.length) }),
  removeBasket: (id) =>
    set((s) => {
      const baskets = s.baskets.filter((b) => b.id !== id);
      return { baskets, health: healthFor(baskets.length) };
    }),
  refillBaskets: () =>
    set((s) => {
      if (s.basketCooldownUntil && Date.now() >= s.basketCooldownUntil) {
        return { basketsLeft: BASKET_BATCH, basketCooldownUntil: 0 };
      }
      return s;
    }),
  diverPos: new THREE.Vector3(),
  diverHeadPos: new THREE.Vector3(),
  diverForward: new THREE.Vector3(0, 0, 1),
  health: healthFor(0), // starting (damaged) meadow
  setHealth: (h) => set({ health: Math.max(0, Math.min(1, h)) }),
  rays: {
    count: 120,
    length: 80,
    radius: 2,
    intensity: 0.95,
    power: 4,
    tilt: 8,
    spread: 62,
    centerY: 2,
    speed: 0.2,
    fadeSpeed: 0.9,
  },
  setRays: (p) => set((s) => ({ rays: { ...s.rays, ...p } })),
}));
