import { beforeEach, expect, it } from "vitest";

import { useGameStore } from "./gameStore";

beforeEach(() => {
	localStorage.clear();
	useGameStore.setState({ phase: "loading", skipTutorial: false });
});

it("starts in the loading phase and transitions via setPhase", () => {
	expect(useGameStore.getState().phase).toBe("loading");

	useGameStore.getState().setPhase("tutorial");
	expect(useGameStore.getState().phase).toBe("tutorial");

	useGameStore.getState().setPhase("game");
	expect(useGameStore.getState().phase).toBe("game");
});

it("persists skipTutorial to localStorage and back", () => {
	useGameStore.getState().setSkipTutorial(true);
	expect(useGameStore.getState().skipTutorial).toBe(true);
	expect(localStorage.getItem("deepcatch.skipTutorial")).toBe("true");

	useGameStore.getState().setSkipTutorial(false);
	expect(localStorage.getItem("deepcatch.skipTutorial")).toBe("false");
});
