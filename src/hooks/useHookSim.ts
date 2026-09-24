import { useEffect, useRef } from "react";

import { useHookStore } from "@stores/hookStore";
import { TICK_HZ } from "@utils/simConfig";
import { createSim, step } from "@utils/simStep";

import { useHookKeys } from "./useHookKeys";

/** A background tab's rAF gap is clamped to this so it can't cause a catch-up burst. */
const MAX_FRAME_MS = 250;

/**
 * Runs the sim from the arrow keys while `active`, on a fixed-step accumulator
 * (`timeScale` just runs more ticks per frame), publishing one snapshot per
 * frame to `hookStore.sim` and clearing it when `active` drops. Calls `onSurfaced` when the run ends.
 */
export function useHookSim(active: boolean, onSurfaced?: () => void): void {
	const axis = useHookKeys(active);
	const onSurfacedRef = useRef(onSurfaced);
	onSurfacedRef.current = onSurfaced;

	useEffect(() => {
		if (!active) return;
		const sim = createSim(useHookStore.getState().worldSeed);
		let accumulator = 0;
		let last = performance.now();
		const publish = () => useHookStore.setState({ sim: { ...sim } });
		publish();

		let frame = requestAnimationFrame(function tick(now) {
			accumulator += (Math.min(now - last, MAX_FRAME_MS) / 1000) * useHookStore.getState().timeScale;
			last = now;
			while (accumulator >= 1 / TICK_HZ) {
				step(sim, axis());
				accumulator -= 1 / TICK_HZ;
			}
			publish();
			if (sim.phase === "surfaced") return onSurfacedRef.current?.();
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
