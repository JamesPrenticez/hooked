// Three sine waves at non-integer-ratio frequencies — same trick as
// `waterSwell`/`windowFlicker` — sum to a slow, non-repeating-looking wander
// instead of a real random walk. Amplitudes sum to 1, so the result always
// stays inside [-1, 1].
const WAVES = [
	{ amp: 0.5, freq: 0.13, phase: 0 },
	{ amp: 0.3, freq: 0.071, phase: 1.7 },
	{ amp: 0.2, freq: 0.29, phase: 4.1 }
];

/** Horizontal drift for the taut fishing line, `-1`..`1`. Slow enough
 *  (~20-90s periods) to read as the line ambling left/right rather than
 *  jittering. */
export function lineDrift(seconds: number): number {
	return WAVES.reduce((sum, w) => sum + w.amp * Math.sin(seconds * w.freq + w.phase), 0);
}
