import type { FillGradient } from "pixi.js";

/**
 * `FillGradient` bakes its color stops into a canvas-drawn texture the first
 * time it's used and only rebuilds if the same instance is reused — so a
 * `draw` callback that does `new FillGradient(...)` every frame uploads a
 * fresh texture 60 times a second. Worse on GPU memory than it sounds:
 * Pixi's texture GC only reclaims an unused texture after ~60s idle
 * (`GCSystem.gcMaxUnusedTime`), so a steady stream of one-frame-lived
 * textures piles up faster than it's swept — this is what shows up as
 * "memory keeps climbing" in devtools.
 *
 * Cache one gradient per (bucketed) RGB and reuse it instead. A color that
 * cycles continuously (a day/night arc, a rainbow beacon) still only ever
 * needs a small, bounded set of buckets, so the cache plateaus instead of
 * growing forever. Per-frame change (glow strength, shimmer, flicker)
 * should be driven through the fill's plain `alpha` multiplier rather than
 * baked into the color stops, so the same cached gradient works at any
 * strength.
 */

/** Rounds each channel to `step`-sized buckets — a soft glow can't show a
 *  finer color step anyway, and it caps how many distinct gradients a
 *  continuously-cycling color ever needs. */
export function bucketColor(color: number, step = 8): [r: number, g: number, b: number] {
	const round = (c: number) => Math.round(c / step) * step;
	return [round((color >> 16) & 0xff), round((color >> 8) & 0xff), round(color & 0xff)];
}

/** Looks up `r,g,b` in `cache`, building and storing it via `build` on a miss. */
export function cachedGradient(
	cache: Map<string, FillGradient>,
	r: number,
	g: number,
	b: number,
	build: (rgb: string) => FillGradient
): FillGradient {
	const key = `${r},${g},${b}`;
	let gradient = cache.get(key);
	if (!gradient) {
		gradient = build(key);
		cache.set(key, gradient);
	}
	return gradient;
}
