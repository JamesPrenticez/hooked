import { create } from "zustand";

// The coarse client phase machine (BUILD_PLAN §0.2, ARCHITECTURE §18). "game"
// is an umbrella for the harbour/betting/round sub-states that land in later
// milestones — this store doesn't know about those yet.
export type GamePhase = "loading" | "tutorial" | "game";

interface GameStore {
	phase: GamePhase;
	setPhase: (phase: GamePhase) => void;
}

export const useGameStore = create<GameStore>(set => ({
	phase: "loading",
	setPhase: phase => set({ phase })
}));
