import { act, renderHook } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

import { useDayNightClock } from "./useDayNightClock";

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

const CYCLE_MS = 120_000;

it("starts the session at noon", () => {
	const { result } = renderHook(() => useDayNightClock());
	expect(result.current).toBeCloseTo(0.5);
});

it("advances through sunset a quarter-cycle later", () => {
	const { result } = renderHook(() => useDayNightClock());

	flushFrame(CYCLE_MS / 4);
	expect(result.current).toBeCloseTo(0.75);
});

it("wraps back past midnight after a full cycle", () => {
	const { result } = renderHook(() => useDayNightClock());

	flushFrame(CYCLE_MS);
	expect(result.current).toBeCloseTo(0.5);
});

it("advances continuously, without stepping", () => {
	const { result } = renderHook(() => useDayNightClock());

	// A tiny nudge moves the value proportionally — no quantisation.
	flushFrame(CYCLE_MS * 0.001);
	expect(result.current).toBeCloseTo(0.501, 4);
});
