import { FillGradient } from "pixi.js";

import type { Celestial } from "./ambience";
import type { HarbourView } from "./layers";
import { windowFlicker } from "./windowFlicker";

interface WaterReflectionsProps {
	view: HarbourView;
	/** Position, colour and glow strength from `computeAmbience`. */
	celestial: Celestial;
	/** `0`..`1` overlay strength from `computeAmbience` — lit-windows glow. */
	windowGlow: number;
	/** Water's unswollen top edge (`OceanLayer`'s `baseTop`) — reflections
	 *  anchor here rather than the wobbling per-layer waterline, so they
	 *  don't jitter with the swell. */
	waterTop: number;
	/** Wall-clock seconds (`useElapsedSeconds`), driving the shimmer. */
	seconds: number;
}

const RIBBON_FRAGMENTS = 32;
/** Below this, `rgba()`'s alpha term can round to something like `7.7e-7` —
 *  a valid JS number but not a valid CSS alpha, so `Color` throws. Rounding
 *  fixes the format; skipping the near-invisible draw is the cheap win. */
const MIN_ALPHA = 0.004;

/** `rgba(r,g,b,a)` with `a` fixed-notation — `String(7.7e-7)` renders as
 *  `"7.7e-7"`, which `Color` rejects. */
function rgba(r: number, g: number, b: number, a: number): string {
	return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a)).toFixed(4)})`;
}

/**
 * Cheap stand-ins for real reflections, both additive and procedural — no
 * render-to-texture / refraction pass: a warm glow band along the waterline
 * for the lit buildings, and a fractured silver ribbon running from the
 * horizon straight to the viewer under the moon (night only — the sun
 * doesn't get one). Good enough to make the water shine at night; not
 * aiming for physically accurate reflection.
 */
function WaterReflections({ view, celestial, windowGlow, waterTop, seconds }: WaterReflectionsProps) {
	const span = view.height - waterTop;

	return (
		<pixiGraphics
			blendMode="add"
			draw={g => {
				g.clear();

				if (windowGlow > 0.01) {
					const glowHeight = span * 0.14;
					const glowAlpha = 0.22 * windowGlow * windowFlicker(seconds);
					g.rect(0, waterTop, view.width, glowHeight).fill(
						new FillGradient({
							type: "linear",
							start: { x: 0, y: 0 },
							end: { x: 0, y: 1 },
							colorStops: [
								{ offset: 0, color: rgba(242, 185, 58, glowAlpha) },
								{ offset: 1, color: rgba(242, 185, 58, 0) }
							],
							textureSpace: "local"
						})
					);
				}

				if (!celestial.isMoon || celestial.intensity <= 0.02) return;
				const cx = celestial.x * view.width;
				const cR = (celestial.color >> 16) & 0xff;
				const cG = (celestial.color >> 8) & 0xff;
				const cB = celestial.color & 0xff;
				const step = (span * 0.85) / (RIBBON_FRAGMENTS - 1);

				for (let i = 0; i < RIBBON_FRAGMENTS; i++) {
					const u = i / (RIBBON_FRAGMENTS - 1); // 0 at the horizon, 1 at the viewer
					const y = waterTop + step * i;
					const horizontalRadius = 4 + 32 * u ** 1.4; // the path converges toward the horizon
					// A vertical radius tied to fragment spacing, not to the
					// converging width, so neighbours overlap into one continuous
					// streak instead of leaving gaps near the horizon.
					const verticalRadius = step * 0.75;
					// A slow sideways sway (the ribbon bends with the swell) plus a
					// fast per-fragment shimmer with a floor — never fully off, so
					// the ribbon reads as continuous while still sparkling. Same
					// non-integer-ratio trick as `windowFlicker`.
					const sway = Math.sin(seconds * 0.7 + i * 1.3) * horizontalRadius * 0.4;
					const shimmer = 0.5 + 0.5 * Math.sin(seconds * 5.2 + i * 2.7);
					const alpha = celestial.intensity * (0.4 + 0.6 * shimmer) * (0.35 + 0.65 * u);
					if (alpha < MIN_ALPHA) continue;

					g.ellipse(cx + sway, y, horizontalRadius, verticalRadius).fill(
						new FillGradient({
							type: "radial",
							center: { x: 0.5, y: 0.5 },
							innerRadius: 0,
							outerCenter: { x: 0.5, y: 0.5 },
							outerRadius: 0.5,
							colorStops: [
								{ offset: 0, color: rgba(cR, cG, cB, 0.9 * alpha) },
								{ offset: 1, color: rgba(cR, cG, cB, 0) }
							],
							textureSpace: "local"
						})
					);
				}
			}}
		/>
	);
}

export default WaterReflections;
