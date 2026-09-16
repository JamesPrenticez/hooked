import { act, renderHook } from "@testing-library/react";
import type { Application } from "pixi.js";
import { beforeEach, expect, it } from "vitest";

import { useGameStore } from "@stores/gameStore";

import { useGameBootstrap } from "./useGameBootstrap";

beforeEach(() => {
	useGameStore.setState({ phase: "loading", skipTutorial: false });
});

/** A fake <Application> whose ticker fires addOnce callbacks synchronously. */
function fakeApp(): Application {
	return { ticker: { addOnce: (fn: () => void) => fn() } } as unknown as Application;
}

it("does not advance while only the frame has rendered", () => {
	const { result } = renderHook(() => useGameBootstrap());

	act(() => {
		result.current(fakeApp());
	});

	expect(useGameStore.getState().phase).toBe("loading");
});

it("does not advance while only the asset load has resolved", async () => {
	renderHook(() => useGameBootstrap());

	await act(async () => {
		await Promise.resolve();
		await Promise.resolve();
	});

	expect(useGameStore.getState().phase).toBe("loading");
});

it("advances to tutorial once both the asset load and a frame are ready", async () => {
	const { result } = renderHook(() => useGameBootstrap());

	act(() => {
		result.current(fakeApp());
	});
	expect(useGameStore.getState().phase).toBe("loading");

	await act(async () => {
		await Promise.resolve();
		await Promise.resolve();
	});

	expect(useGameStore.getState().phase).toBe("tutorial");
});

it("skips straight to game when skipTutorial is set", async () => {
	useGameStore.setState({ skipTutorial: true });
	const { result } = renderHook(() => useGameBootstrap());

	act(() => {
		result.current(fakeApp());
	});

	await act(async () => {
		await Promise.resolve();
		await Promise.resolve();
	});

	expect(useGameStore.getState().phase).toBe("game");
});

it("does not jump to game if skipTutorial is toggled on after reaching tutorial", async () => {
	const { result } = renderHook(() => useGameBootstrap());

	act(() => {
		result.current(fakeApp());
	});
	await act(async () => {
		await Promise.resolve();
		await Promise.resolve();
	});
	expect(useGameStore.getState().phase).toBe("tutorial");

	act(() => {
		useGameStore.getState().setSkipTutorial(true);
	});

	expect(useGameStore.getState().phase).toBe("tutorial");
});
