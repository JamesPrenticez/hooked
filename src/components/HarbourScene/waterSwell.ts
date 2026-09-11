/**
 * Vertical breathing offset (px) for the water surface. Two sine waves at
 * different, non-integer-ratio frequencies so the swell doesn't read as a
 * metronome — same trick as `windowFlicker`. `phase` staggers independent
 * callers (one per water layer in `OceanLayer`) so their waterlines don't
 * bob in lockstep. Pure function of its inputs — no state.
 */
export function waterSwell(seconds: number, phase = 0): number {
	return 3 * Math.sin(seconds * 0.6 + phase) + 1.5 * Math.sin(seconds * 1.3 + phase * 1.7 + 1.1);
}
