import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { useHookStore } from "@stores/hookStore";
import { SIM_VERSION } from "@utils/simConfig";
import { decodeInputs, encodeInputs } from "@utils/simRecording";
import { createSim, step } from "@utils/simStep";

import { useHookSim } from "./useHookSim";

beforeEach(() => {
	vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance"] });
	useHookStore.setState({
		hookMode: "manual",
		worldSeed: 1,
		multiplier: 1,
		timeScale: 8,
		sim: undefined,
		recording: undefined
	});
});

afterEach(() => vi.useRealTimers());

const key = (type: "keydown" | "keyup") => window.dispatchEvent(new KeyboardEvent(type, { key: "ArrowRight" }));

/** Runs the fake clock on in frames until `done`, or fails. */
function runUntil(done: () => boolean) {
	for (let ms = 0; !done(); ms += 100) {
		if (ms > 120_000) throw new Error("the run never finished");
		act(() => vi.advanceTimersByTime(100));
	}
}

it("records every tick's steering, and the recording replays to the catch it reports", () => {
	const onSurfaced = vi.fn();
	renderHook(() => useHookSim(true, onSurfaced));

	act(() => key("keydown"));
	act(() => vi.advanceTimersByTime(80));
	act(() => key("keyup"));
	runUntil(() => onSurfaced.mock.calls.length > 0);

	const { recording, sim } = useHookStore.getState();
	if (!recording) throw new Error("no recording");
	expect(onSurfaced).toHaveBeenCalledOnce();
	expect(recording).toMatchObject({ simVersion: SIM_VERSION, worldSeed: 1, multiplier: 1 });
	expect(recording.result).toEqual(sim?.result);

	// The recording alone is enough to play the run again: same hook, same catch, same length.
	const axes = decodeInputs(recording.inputs);
	expect(axes.some(axis => axis === 1)).toBe(true);
	// Exactly the run: nothing recorded from the rest of the frame it surfaced in (×8 runs several ticks a frame).
	expect(axes).toHaveLength(recording.result.ticks);
	const replay = createSim(1);
	for (const axis of axes) step(replay, axis);
	expect(replay.phase).toBe("surfaced");
	expect(replay.result).toEqual(recording.result);
});

it("a run that is cut short leaves no recording, and a new run clears the last one", () => {
	const first = renderHook(({ active }) => useHookSim(active), { initialProps: { active: true } });
	act(() => vi.advanceTimersByTime(500));
	first.rerender({ active: false });
	expect(useHookStore.getState().recording).toBeUndefined();

	const onSurfaced = vi.fn();
	const second = renderHook(() => useHookSim(true, onSurfaced));
	runUntil(() => onSurfaced.mock.calls.length > 0);
	expect(useHookStore.getState().recording).toBeDefined();
	second.unmount();

	renderHook(() => useHookSim(true));
	expect(useHookStore.getState().recording).toBeUndefined();
});

it("replay mode plays a stored run without the keys and reproduces its catch", () => {
	const axes = Array.from({ length: 200 }, (_, i) => (i < 60 ? 1 : 0));
	const expected = createSim(1);
	for (let i = 0; expected.phase !== "surfaced"; i++) step(expected, axes[i] ?? 0);
	const inputs = encodeInputs(Array.from({ length: expected.tick }, (_, i) => axes[i] ?? 0));
	useHookStore.setState({ hookMode: "replay", replay: { worldSeed: 1, multiplier: 1, inputs } });

	const onSurfaced = vi.fn();
	renderHook(() => useHookSim(true, onSurfaced));
	runUntil(() => onSurfaced.mock.calls.length > 0);

	expect(useHookStore.getState().recording?.result).toEqual(expected.result);
	expect(useHookStore.getState().recording?.inputs).toEqual(inputs);
	useHookStore.setState({ hookMode: "auto", replay: undefined });
});
