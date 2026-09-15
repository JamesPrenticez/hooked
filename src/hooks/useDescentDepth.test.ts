import { act, renderHook } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

import { useDescentDepth } from "./useDescentDepth";

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

it("stays at zero while inactive", () => {
	const { result } = renderHook(() => useDescentDepth(false));
	expect(result.current).toBe(0);
});

it("advances in metres once active", () => {
	const { result } = renderHook(() => useDescentDepth(true));
	flushFrame(1000);
	expect(result.current).toBeCloseTo(220);
});

it("resets to zero when it goes inactive again", () => {
	const { result, rerender } = renderHook(({ active }) => useDescentDepth(active), { initialProps: { active: true } });
	flushFrame(1000);
	expect(result.current).toBeGreaterThan(0);

	rerender({ active: false });
	expect(result.current).toBe(0);
});
