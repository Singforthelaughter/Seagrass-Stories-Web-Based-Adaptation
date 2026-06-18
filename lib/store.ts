import { create } from "zustand";

export type Vec3 = [number, number, number];

interface GameState {
  /** Where the local diver is swimming toward (world-space point on the seafloor). */
  diverTarget: Vec3 | null;
  setDiverTarget: (t: Vec3) => void;
}

export const useGame = create<GameState>((set) => ({
  diverTarget: null,
  setDiverTarget: (t) => set({ diverTarget: t }),
}));
