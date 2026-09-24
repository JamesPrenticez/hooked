import { FillGradient } from "pixi.js";

import type { Celestial } from "./ambience";
import { bucketColor, cachedGradient } from "./gradientCache";
import type { HarbourView } from "./layers";

interface CelestialBodyProps {
	view: HarbourView;
	/** Position, colour and glow strength from `computeAmbience`. */
	celestial: Celestial;
}

/** The sun sweeps through ~125 distinct RGBs a day (the moon's is constant)
 *  — see `gradientCache` for why these get cached instead of rebuilt. */
const glowGradientCache = new Map<string, FillGradient>();

function glowGradient(color: number): FillGradient {
	const [r, g, b] = bucketColor(color);
	return cachedGradient(
		glowGradientCache,
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
				// bilinear-scales this up over a radius of a few hundred px fine.
				textureSize: 64,
				colorStops: [
					{ offset: 0, color: `rgba(${rgb},0.55)` },
					{ offset: 0.45, color: `rgba(${rgb},0.12)` },
					{ offset: 1, color: `rgba(${rgb},0)` }
				],
				textureSpace: "local"
			})
	);
}

/**
 * The sun or moon and its glow, tracking the day / night arc. Nothing is
 * drawn while the body is at or below the horizon.
 */
export function CelestialBody({ view, celestial }: CelestialBodyProps) {
	if (celestial.intensity <= 0.02) return null;

	return (
		<pixiGraphics
			blendMode="add"
			draw={g => {
				g.clear();
				const cx = celestial.x * view.width;
				const cy = celestial.y * view.height;
				const r = Math.min(view.width, view.height) * 0.035;
				const glow = 0.4 + 0.6 * celestial.intensity;
				// radial alpha falloff — stacked hard circles read as a disc,
				// not a glow. A full bloom filter is the §7.1 lighting pass.
				g.circle(cx, cy, r * 5).fill({ fill: glowGradient(celestial.color), alpha: glow });
				g.circle(cx, cy, r).fill({ color: celestial.color, alpha: 0.9 });
			}}
		/>
	);
}
