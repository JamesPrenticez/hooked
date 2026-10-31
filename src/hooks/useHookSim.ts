import { useEffect, useRef } from "react";

import { useHookStore } from "@stores/hookStore";
import { useRoundStore } from "@stores/roundStore";
import { autopilotAxis } from "@utils/simAutopilot";
import { SIM_VERSION, TICK_HZ } from "@utils/simConfig";
import { MIN_MULTIPLIER } from "@utils/simExtraction";
import { decodeInputs, encodeInputs } from "@utils/simRecording";
import { createSim, step } from "@utils/simStep";

import { useHookKeys } from "./useHookKeys";

/** A background tab's rAF gap is clamped to this so it can't cause a catch-up burst. */
const MAX_FRAME_MS = 250;

/**
 * Runs the sim while `active`, on a fixed-step accumulator (`timeScale` just runs more ticks per frame), publishing one
 * snapshot per frame to `hookStore.sim` and clearing it when `active` drops. A real cast plays out the round the
 * server opened: the autopilot steers the hook to the fish the server chose, and the catch weighs what the round's
 * market says it pays. In the debug sandbox the arrow keys steer instead (`manual`), or a stored recording does
 * (`replay`), and any fish will take the hook. Every tick's steering is kept, and when a sandbox run ends it is
 * published as `hookStore.recording` before `onSurfaced` is called. A run cut short, aimed at a fish, or sped up or
 * slowed with ↑/↓ leaves none — the server could not replay it without the target or the speed.
 */
export function useHookSim(active: boolean, onSurfaced?: () => void): void {
	const keys = useHookKeys(active);
	const onSurfacedRef = useRef(onSurfaced);
	onSurfacedRef.current = onSurfaced;

	useEffect(() => {
		if (!active) return;
		const state = useHookStore.getState();
		// In replay mode the recording fixes the world and every tick's steering; the keys are not read.
		const run = state.hookMode === "replay" ? state.replay : undefined;
		const script = run ? decodeInputs(run.inputs) : undefined;
		const manual = state.hookMode === "manual";
		const round = manual || run ? undefined : useRoundStore.getState().round;
		const target = round?.outcome.fish;
		const escapes = round?.outcome.escaped ?? false;
		// Only a manual run (which already ignores the server's round) takes the debug multiplier.
		const multiplier =
			run?.multiplier ??
			(manual ? state.multiplier : undefined) ??
			(round ? Math.max(Number(round.outcome.multiplier), MIN_MULTIPLIER) : MIN_MULTIPLIER);
		// A fresh world each cast; the debug panel's seed only pins it for manual runs and replays.
		const worldSeed = run?.worldSeed ?? (manual ? state.worldSeed : Math.floor(Math.random() * 2 ** 31));
		const sim = createSim(worldSeed, multiplier, target, escapes);
		const axes: number[] = [];
		let throttled = false;
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
				axes.push(script ? (script[sim.tick] ?? 0) : manual ? keys.axis() : autopilotAxis(sim));
				const rate = manual ? keys.rate() : 1;
				throttled ||= rate !== 1;
				step(sim, axes[axes.length - 1], rate);
				accumulator -= 1 / TICK_HZ;
			}
			publish();
			if (sim.result) {
				if (!target && !throttled) {
					const inputs = encodeInputs(axes);
					useHookStore.setState({
						recording: { simVersion: SIM_VERSION, worldSeed, multiplier, inputs, result: sim.result }
					});
				}
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
