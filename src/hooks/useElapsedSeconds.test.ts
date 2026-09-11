import { act, renderHook } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

import { useElapsedSeconds } from "./useElapsedSeconds";

let rafCallbacks: Map<number, FrameRequestCallback>;
let nextRafId = 1;
let now = 0;

beforeEach(() => {
	rafCallbacks = new Map();
	nextRafId = 1;
	now = 0;
	vi.spyOn(performance, "now").mockImplementation(() => now);
	vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
		const id = nextRafId++;
		rafCallbacks.set(id, cb);
		return id;
	});
	vi.stubGlobal("cancelAnimationFrame", (id: number) => rafCallbacks.delete(id));
});

function flushFrame(atTime: number) {
	now = atTime;
	const callbacks = [...rafCallbacks.values()];
	rafCallbacks.clear();
	act(() => callbacks.forEach(cb => cb(now)));
}

it("starts at zero", () => {
	const { result } = renderHook(() => useElapsedSeconds());
	expect(result.current).toBe(0);
});

it("advances in seconds off wall-clock time", () => {
	const { result } = renderHook(() => useElapsedSeconds());
	flushFrame(2500);
	expect(result.current).toBeCloseTo(2.5);
});
