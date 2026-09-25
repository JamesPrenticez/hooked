import { act, renderHook } from "@testing-library/react";
import type { Application } from "pixi.js";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { MIN_LOADING_MS } from "@constants/config";
import { useGameStore } from "@stores/gameStore";

import { useGameBootstrap } from "./useGameBootstrap";

vi.mock("@utils/bootAssets", () => ({ loadBootAssets: () => Promise.resolve({}) }));

beforeEach(() => {
	vi.useFakeTimers();
	useGameStore.setState({ phase: "loading" });
});

afterEach(() => {
	vi.useRealTimers();
});

/** A fake <Application> whose ticker fires addOnce callbacks synchronously. */
function fakeApp(): Application {
	return { ticker: { addOnce: (fn: () => void) => fn() } } as unknown as Application;
}

it("does not advance while only the frame has rendered", () => {
	const { result } = renderHook(() => useGameBootstrap());

	act(() => {
		result.current.onInit(fakeApp());
	});

	expect(useGameStore.getState().phase).toBe("loading");
});

it("does not advance while only the asset load has resolved", async () => {
	renderHook(() => useGameBootstrap());

	await act(async () => {
		await Promise.resolve();
		await Promise.resolve();
		vi.advanceTimersByTime(MIN_LOADING_MS);
	});

	expect(useGameStore.getState().phase).toBe("loading");
});

it("advances straight to game once both the asset load and a frame are ready", async () => {
	const { result } = renderHook(() => useGameBootstrap());

	act(() => {
		result.current.onInit(fakeApp());
	});
	expect(useGameStore.getState().phase).toBe("loading");

	await act(async () => {
		await Promise.resolve();
		await Promise.resolve();
		vi.advanceTimersByTime(MIN_LOADING_MS);
	});

	expect(useGameStore.getState().phase).toBe("game");
});

it("stays on loading until the minimum display time has passed", async () => {
	const { result } = renderHook(() => useGameBootstrap());

	act(() => {
		result.current.onInit(fakeApp());
	});
	await act(async () => {
		await Promise.resolve();
		await Promise.resolve();
		vi.advanceTimersByTime(MIN_LOADING_MS - 1);
	});
	expect(useGameStore.getState().phase).toBe("loading");

	act(() => {
		vi.advanceTimersByTime(1);
	});
	expect(useGameStore.getState().phase).toBe("game");
});
