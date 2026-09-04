import { beforeEach, expect, it } from "vitest";

import { useGameStore } from "./gameStore";

beforeEach(() => {
	useGameStore.setState({ phase: "loading" });
});

it("starts in the loading phase and transitions via setPhase", () => {
	expect(useGameStore.getState().phase).toBe("loading");

	useGameStore.getState().setPhase("tutorial");
	expect(useGameStore.getState().phase).toBe("tutorial");

	useGameStore.getState().setPhase("game");
	expect(useGameStore.getState().phase).toBe("game");
});
