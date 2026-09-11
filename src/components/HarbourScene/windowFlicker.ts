/**
 * Subtle multiplicative flicker for the lit-windows overlay. Two sine waves
 * at different, non-integer-ratio frequencies so the shimmer doesn't read
 * as a uniform strobe or repeat on an obvious period. Pure function of
 * wall-clock seconds — no state, no per-window art needed.
 */
export function windowFlicker(seconds: number): number {
	return 1 + 0.05 * Math.sin(seconds * 5.3) + 0.03 * Math.sin(seconds * 11.7 + 2.1);
}
