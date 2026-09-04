import { act, renderHook } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

import { useCrossfade } from "./useCrossfade";

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

/** Advances the mocked clock to `atTime` and flushes whatever frames are still pending. */
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

it("returns null until activeKey changes", () => {
	const { result } = renderHook(({ key }) => useCrossfade(key), { initialProps: { key: "a" } });
	expect(result.current).toBeNull();
});

it("fades the previous key out over 300ms, then returns null", () => {
	const { result, rerender } = renderHook(({ key }) => useCrossfade(key), { initialProps: { key: "a" } });

	rerender({ key: "b" });
	flushFrame(150);
	expect(result.current).toEqual({ key: "a", alpha: 0.5 });

	flushFrame(300);
	expect(result.current).toBeNull();
});

it("cancels the stale fade and starts a fresh one if activeKey changes again mid-fade", () => {
	const { result, rerender } = renderHook(({ key }) => useCrossfade(key), { initialProps: { key: "a" } });

	rerender({ key: "b" });
	flushFrame(150);
	expect(result.current).toEqual({ key: "a", alpha: 0.5 });

	rerender({ key: "c" });
	flushFrame(150);
	expect(result.current).toEqual({ key: "b", alpha: 1 });
});
