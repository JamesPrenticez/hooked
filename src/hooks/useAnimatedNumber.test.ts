import { act, renderHook } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

import { useAnimatedNumber } from "./useAnimatedNumber";

// rAF harness mirrors useCrossfade.test.ts — drive frames by hand off a
// mocked clock so the ease is deterministic without a real renderer.
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
	vi.stubGlobal("cancelAnimationFrame", (id: number) => {
		rafCallbacks.delete(id);
	});
});

function flushFrame(atTime: number) {
	now = atTime;
	const callbacks = [...rafCallbacks.values()];
	rafCallbacks.clear();
	act(() => {
		callbacks.forEach(cb => {
			cb(now);
		});
	});
}

it("returns the initial value with no animation queued", () => {
	const { result } = renderHook(({ n }) => useAnimatedNumber(n), { initialProps: { n: 100 } });
	expect(result.current).toBe(100);
	expect(rafCallbacks.size).toBe(0);
});

it("eases toward a new target and settles exactly on it", () => {
	const { result, rerender } = renderHook(({ n }) => useAnimatedNumber(n), { initialProps: { n: 0 } });
	rerender({ n: 1000 });

	flushFrame(300); // half duration; easeOut(0.5) = 1 - 0.5^3 = 0.875
	expect(result.current).toBeCloseTo(875);

	flushFrame(600);
	expect(result.current).toBe(1000);
	expect(rafCallbacks.size).toBe(0);
});

it("retargets from the value on screen, not the original start", () => {
	const { result, rerender } = renderHook(({ n }) => useAnimatedNumber(n), { initialProps: { n: 0 } });
	rerender({ n: 1000 });
	flushFrame(300);
	const mid = result.current;
	expect(mid).toBeGreaterThan(0);
	expect(mid).toBeLessThan(1000);

	rerender({ n: 0 });
	flushFrame(300); // first frame of the new tween — still ~mid, not snapped back to 0
	expect(result.current).toBeCloseTo(mid, 5);

	flushFrame(900);
	expect(result.current).toBe(0);
});

it("stops animating when unmounted", () => {
	const { rerender, unmount } = renderHook(({ n }) => useAnimatedNumber(n), { initialProps: { n: 0 } });
	rerender({ n: 1000 });
	expect(rafCallbacks.size).toBe(1);

	unmount();
	expect(rafCallbacks.size).toBe(0);
});
