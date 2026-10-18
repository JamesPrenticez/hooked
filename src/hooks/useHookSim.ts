import { useEffect, useRef } from "react";

import { useHookStore } from "@stores/hookStore";
import { autopilotAxis } from "@utils/simAutopilot";
import { SIM_VERSION, TICK_HZ } from "@utils/simConfig";
import { decodeInputs, encodeInputs } from "@utils/simRecording";
import { createSim, step } from "@utils/simStep";

import { useHookKeys } from "./useHookKeys";

/** A background tab's rAF gap is clamped to this so it can't cause a catch-up burst. */
const MAX_FRAME_MS = 250;

/**
 * Runs the sim from the arrow keys (or, in `replay` mode, a stored recording) while `active`, on a fixed-step accumulator
 * (`timeScale` just runs more ticks per frame), publishing one snapshot per
 * frame to `hookStore.sim` and clearing it when `active` drops. Every tick's steering is kept, and when the
 * run ends it is published as `hookStore.recording` before `onSurfaced` is called. A run cut short leaves none.
 */
export function useHookSim(active: boolean, onSurfaced?: () => void): void {
	const axis = useHookKeys(active);
	const onSurfacedRef = useRef(onSurfaced);
	onSurfacedRef.current = onSurfaced;

	useEffect(() => {
		if (!active) return;
		const state = useHookStore.getState();
		// In replay mode the recording fixes the world and every tick's steering; the keys are not read.
		const run = state.hookMode === "replay" ? state.replay : undefined;
		const script = run ? decodeInputs(run.inputs) : undefined;
		const manual = state.hookMode === "manual";
		const { multiplier } = run ?? state;
		// A fresh world each cast; the debug panel's seed only pins it for manual runs and replays.
		const worldSeed = run?.worldSeed ?? (manual ? state.worldSeed : Math.floor(Math.random() * 2 ** 31));
		const sim = createSim(worldSeed, multiplier);
		const axes: number[] = [];
		let accumulator = 0;
		let last = performance.now();
		const publish = () => useHookStore.setState({ sim: { ...sim } });
		publish();
		useHookStore.setState({ recording: undefined });

		let frame = requestAnimationFrame(function tick(now) {
			accumulator += (Math.min(now - last, MAX_FRAME_MS) / 1000) * useHookStore.getState().timeScale;
			last = now;
			// Stops the tick it surfaces: a recording carries exactly the run, nothing from the rest of the frame.
			while (accumulator >= 1 / TICK_HZ && !sim.result) {
				axes.push(script ? (script[sim.tick] ?? 0) : manual ? axis() : autopilotAxis(sim));
				step(sim, axes[axes.length - 1]);
				accumulator -= 1 / TICK_HZ;
			}
			publish();
			if (sim.result) {
				const inputs = encodeInputs(axes);
				useHookStore.setState({
					recording: { simVersion: SIM_VERSION, worldSeed, multiplier, inputs, result: sim.result }
				});
				return onSurfacedRef.current?.();
			}
			frame = requestAnimationFrame(tick);
		});
		return () => {
			cancelAnimationFrame(frame);
			useHookStore.setState({ sim: undefined });
		};
		// axis is a stable-enough getter over a ref; re-running on it would reset the run
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [active]);
}
