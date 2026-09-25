import { FillGradient } from "pixi.js";

import type { Celestial } from "./ambience";
import { bucketColor, cachedGradient } from "./gradientCache";
import { type HarbourView, OVERSCAN } from "./layers";
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
	/** Where the harbour water ends and the underwater begins. */
	waterBottom: number;
	/** Wall-clock seconds (`useElapsedSeconds`), driving the shimmer. */
	seconds: number;
}

const RIBBON_FRAGMENTS = 32;
/** Below this the ellipse is invisible — skip the draw call. */
const MIN_ALPHA = 0.004;

/** `242,185,58` baked at full reference alpha — `windowGlowGradient`'s and
 *  `ribbonGradient`'s per-frame `alpha` fill parameter scales it down, so
 *  the gradient itself never needs rebuilding for that color. */
const GLOW_COLOR = "242,185,58";

/** The moon's color is a constant in `ambience.ts`, so this cache only ever
 *  holds one entry — see `gradientCache` for why it's cached at all. */
const ribbonGradientCache = new Map<string, FillGradient>();

function ribbonGradient(color: number): FillGradient {
	const [r, g, b] = bucketColor(color);
	return cachedGradient(
		ribbonGradientCache,
		r,
		g,
		b,
		rgb =>
			new FillGradient({
				type: "radial",
				center: { x: 0.5, y: 0.5 },
				innerRadius: 0,
				outerCenter: { x: 0.5, y: 0.5 },
				outerRadius: 0.5,
				// A soft blurred glow doesn't need a crisp texture — the GPU
				// bilinear-scales this up over each ellipse fine.
				textureSize: 64,
				colorStops: [
					{ offset: 0, color: `rgba(${rgb},0.9)` },
					{ offset: 1, color: `rgba(${rgb},0)` }
				],
				textureSpace: "local"
			})
	);
}

const windowGlowGradient = new FillGradient({
	type: "linear",
	start: { x: 0, y: 0 },
	end: { x: 0, y: 1 },
	colorStops: [
		{ offset: 0, color: `rgba(${GLOW_COLOR},1)` },
		{ offset: 1, color: `rgba(${GLOW_COLOR},0)` }
	],
	textureSpace: "local"
});

/**
 * Cheap stand-ins for real reflections, both additive and procedural — no
 * render-to-texture / refraction pass: a warm glow band along the waterline
 * for the lit buildings, and a fractured silver ribbon running from the
 * horizon straight to the viewer under the moon (night only — the sun
 * doesn't get one). Good enough to make the water shine at night; not
 * aiming for physically accurate reflection.
 */
export function WaterReflections({
	view,
	celestial,
	windowGlow,
	waterTop,
	waterBottom,
	seconds
}: WaterReflectionsProps) {
	const span = waterBottom - waterTop;

	return (
		<pixiGraphics
			blendMode="add"
			draw={g => {
				g.clear();

				if (windowGlow > 0.01) {
					const glowHeight = span * 0.14;
					const glowAlpha = 0.22 * windowGlow * windowFlicker(seconds);
					g.rect(-view.width * OVERSCAN, waterTop, view.width * (1 + 2 * OVERSCAN), glowHeight).fill({
						fill: windowGlowGradient,
						alpha: glowAlpha
					});
				}

				if (!celestial.isMoon || celestial.intensity <= 0.02) return;
				const cx = celestial.x * view.width;
				const gradient = ribbonGradient(celestial.color);
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

					g.ellipse(cx + sway, y, horizontalRadius, verticalRadius).fill({ fill: gradient, alpha });
				}
			}}
		/>
	);
}
