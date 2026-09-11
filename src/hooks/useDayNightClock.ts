import { useEffect, useState } from "react";

/** Real seconds for one full midnight→noon→midnight cycle. Deliberately
 *  short so the effect is visible while building the harbour; wall-clock
 *  sync or a slower rate is a later call. */
const CYCLE_MS = 120_000;
/** Start the session at noon rather than midnight. */
const PHASE = 0.5;

/** `?tod=0.8` freezes the clock at that time of day — a review aid for
 *  checking dusk / night without waiting out the cycle. */
function frozenOverride(): number | null {
	if (typeof location === "undefined") return null;
	const raw = new URLSearchParams(location.search).get("tod");
	const n = raw === null ? NaN : Number(raw);
	return Number.isFinite(n) ? ((n % 1) + 1) % 1 : null;
}

function timeOfDay(): number {
	return (performance.now() / CYCLE_MS + PHASE) % 1;
}

/**
 * Normalised time of day in `[0, 1)` (`0` midnight, `0.25` sunrise, `0.5`
 * noon, `0.75` sunset), advancing off wall-clock time. Drives off
 * `requestAnimationFrame` rather than Pixi's ticker so it needs no renderer
 * to test (ARCHITECTURE Rule 11) — see `useCrossfade`.
 */
export function useDayNightClock(): number {
	const [t, setT] = useState(() => frozenOverride() ?? timeOfDay());

	useEffect(() => {
		if (frozenOverride() !== null) return;
		let frame = requestAnimationFrame(function tick() {
			setT(timeOfDay());
			frame = requestAnimationFrame(tick);
		});
		return () => cancelAnimationFrame(frame);
	}, []);

	return t;
}
