import { create } from "zustand";

export type Vec3 = [number, number, number];

/** "personalise" = inspecting the diver up close; "playing" = in the meadow. */
export type Phase = "personalise" | "playing";

interface GameState {
  /** Current stage of the single shared 3D experience. */
  phase: Phase;
  setPhase: (p: Phase) => void;
  /** The player's chosen diver name (set on the Personalise screen). */
  username: string;
  setUsername: (name: string) => void;
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
}

export const useGame = create<GameState>((set) => ({
  phase: "personalise",
  setPhase: (p) => set({ phase: p }),
  username: "",
  setUsername: (name) => set({ username: name }),
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
}));
