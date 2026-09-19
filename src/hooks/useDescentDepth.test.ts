import { act, renderHook } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

import { MAX_DEPTH_METERS } from "@constants/depthZones";
import { useDebugStore } from "@stores/debugStore";
import { useKrakenStore } from "@stores/krakenStore";

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

	for (const zone of useDebugStore.getState().depthZones) {
		useDebugStore.getState().setZoneSpeed(zone.id, 220);
	}
	useKrakenStore.setState({ forceTrench: false });
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

it("stops at the max depth instead of overshooting it", () => {
	for (const zone of useDebugStore.getState().depthZones) {
		useDebugStore.getState().setZoneSpeed(zone.id, 1_000_000);
	}
	const { result } = renderHook(() => useDescentDepth(true));

	flushFrame(1000);
	expect(result.current).toBe(MAX_DEPTH_METERS);
});

it("holds at the bottom, then reels back to the surface and calls onSurfaced", () => {
	for (const zone of useDebugStore.getState().depthZones) {
		useDebugStore.getState().setZoneSpeed(zone.id, 1_000_000);
	}
	const onSurfaced = vi.fn();
	const { result } = renderHook(() => useDescentDepth(true, onSurfaced));

	flushFrame(1000); // reaches the bottom, starts the hold
	flushFrame(1500); // still holding
	expect(result.current).toBe(MAX_DEPTH_METERS);
	expect(onSurfaced).not.toHaveBeenCalled();

	flushFrame(2500); // hold elapsed, now ascending
	flushFrame(2500 + Math.ceil(MAX_DEPTH_METERS / 600 + 1) * 1000); // long enough to reel all the way in

	expect(result.current).toBe(0);
	expect(onSurfaced).toHaveBeenCalledTimes(1);
});

it("with the trench forced, dives at its own speed rather than the tier's and holds at the bottom", () => {
	useKrakenStore.setState({ forceTrench: true });
	const onSurfaced = vi.fn();
	const { result } = renderHook(() => useDescentDepth(true, onSurfaced));

	flushFrame(1000);
	expect(result.current).toBeGreaterThan(1000); // the tier's 220m/s would give 220

	flushFrame(60_000); // plenty to reach the bottom, and far past the usual 1s hold
	flushFrame(120_000);
	expect(result.current).toBe(MAX_DEPTH_METERS);
	expect(onSurfaced).not.toHaveBeenCalled();
});

it("heads back up once the forced trench is switched off", () => {
	useKrakenStore.setState({ forceTrench: true });
	const { result } = renderHook(() => useDescentDepth(true));
	flushFrame(60_000);
	flushFrame(120_000);
	expect(result.current).toBe(MAX_DEPTH_METERS);

	useKrakenStore.setState({ forceTrench: false });
	flushFrame(121_000); // the frame it notices the switch
	flushFrame(122_000);
	expect(result.current).toBeLessThan(MAX_DEPTH_METERS);
});
