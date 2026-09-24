import { CAST_METERS, SIM_WIDTH } from "@utils/simConfig";

// Three sine waves at non-integer-ratio frequencies — same trick as
// `waterSwell`/`windowFlicker` — sum to a sweep that crosses the screen without
// visibly repeating, instead of a real random walk. Amplitudes sum to 1, so the
// result always stays inside [-1, 1].
const WAVES = [
	{ amp: 0.5, freq: 0.9, phase: 0 },
	{ amp: 0.3, freq: 0.5, phase: 1.7 },
	{ amp: 0.2, freq: 1.7, phase: 4.1 }
];

/** Horizontal drift for the hook, `-1`..`1`. The dominant wave has a ~7s
 *  period, so the hook sweeps left and right across the screen. */
export function lineDrift(seconds: number): number {
	return WAVES.reduce((sum, w) => sum + w.amp * Math.sin(seconds * w.freq + w.phase), 0);
}

/** How far `lineDrift`'s `-1..1` swings the hook, as a fraction of the screen
 *  width either side of centre. */
const DRIFT_FRACTION = 0.4;

/** Px below the surface over which the hook eases from hanging under the rod tip
 *  into the sweep, as a fraction of the screen height. */
const ENTRY_BLEND = 1.5;

/** Screen x of the sim's hook: `simX` eased from under the rod tip over the cast. */
export function simHookX(tipX: number, simX: number, depthM: number, viewWidth: number) {
	const t = Math.min(1, depthM / CAST_METERS);
	return tipX + ((simX / SIM_WIDTH) * viewWidth - tipX) * t * t * (3 - 2 * t);
}

/**
 * World x of the hook. It falls straight down from the rod tip (`tipX`) until it
 * hits the water, then eases into `lineDrift`'s sweep over `ENTRY_BLEND` of the
 * screen height so there's no jump. `belowSurface` is the hook's depth under the
 * waterline in px (negative while it's still in the air).
 */
export function hookX(tipX: number, view: { width: number; height: number }, belowSurface: number, seconds: number) {
	const t = Math.min(1, Math.max(0, belowSurface / (view.height * ENTRY_BLEND)));
	const sweep = view.width / 2 + lineDrift(seconds) * view.width * DRIFT_FRACTION;
	return tipX + (sweep - tipX) * t * t * (3 - 2 * t);
}
