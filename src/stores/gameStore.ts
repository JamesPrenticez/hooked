import { create } from "zustand";

// The coarse client phase machine (BUILD_PLAN §0.2, ARCHITECTURE §18). "game"
// is an umbrella for the harbour/betting/round sub-states that land in later
// milestones — this store doesn't know about those yet.
export type GamePhase = "loading" | "tutorial" | "game";

const SKIP_TUTORIAL_KEY = "deepcatch.skipTutorial";

function readSkipTutorial(): boolean {
	try {
		return localStorage.getItem(SKIP_TUTORIAL_KEY) === "true";
	} catch {
		return false;
	}
}

interface GameStore {
	phase: GamePhase;
	setPhase: (phase: GamePhase) => void;
	skipTutorial: boolean;
	setSkipTutorial: (skip: boolean) => void;
}

export const useGameStore = create<GameStore>(set => ({
	phase: "loading",
	setPhase: phase => set({ phase }),
	skipTutorial: readSkipTutorial(),
	setSkipTutorial: skip => {
		try {
			localStorage.setItem(SKIP_TUTORIAL_KEY, String(skip));
		} catch {
			// Storage disabled (private mode): the toggle still works for this tab.
		}
		set({ skipTutorial: skip });
	}
}));
