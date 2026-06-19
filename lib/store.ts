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
  /** AI-generated wetsuit (M_Suit) texture, as a data URL. null = plain black. */
  suitTextureUrl: string | null;
  setSuitTextureUrl: (url: string | null) => void;
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
  move: [0, 0],
  setMove: (x, y) => set({ move: [x, y] }),
}));
