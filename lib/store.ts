import { create } from "zustand";

export type Vec3 = [number, number, number];

interface GameState {
  /** The player's chosen diver name (set on the Personalise screen). */
  username: string;
  setUsername: (name: string) => void;
  /** Where the local diver is swimming toward (world-space point on the seafloor). */
  diverTarget: Vec3 | null;
  setDiverTarget: (t: Vec3) => void;
}

export const useGame = create<GameState>((set) => ({
  username: "",
  setUsername: (name) => set({ username: name }),
  diverTarget: null,
  setDiverTarget: (t) => set({ diverTarget: t }),
}));
