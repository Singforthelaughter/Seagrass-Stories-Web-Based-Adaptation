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
  /** Where the local diver is swimming toward (world-space point on the seafloor). */
  diverTarget: Vec3 | null;
  setDiverTarget: (t: Vec3) => void;
}

export const useGame = create<GameState>((set) => ({
  phase: "personalise",
  setPhase: (p) => set({ phase: p }),
  username: "",
  setUsername: (name) => set({ username: name }),
  diverTarget: null,
  setDiverTarget: (t) => set({ diverTarget: t }),
}));
