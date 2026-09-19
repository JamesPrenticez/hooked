import { beforeEach, expect, it } from "vitest";

import { usePlayerStore } from "./playerStore";

beforeEach(() => {
	usePlayerStore.setState({ cue: { animation: "idle", id: 0 } });
});

it("starts on idle", () => {
	expect(usePlayerStore.getState().cue.animation).toBe("idle");
});

it("play switches the animation", () => {
	usePlayerStore.getState().play("reel");
	expect(usePlayerStore.getState().cue.animation).toBe("reel");
});

it("play gives a fresh cue even for the animation already running, so it restarts", () => {
	const { play } = usePlayerStore.getState();
	play("cast");
	const first = usePlayerStore.getState().cue;
	play("cast");
	const second = usePlayerStore.getState().cue;

	expect(second.animation).toBe("cast");
	expect(second.id).not.toBe(first.id);
});
