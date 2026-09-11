import { FillGradient } from "pixi.js";

import type { Celestial } from "./ambience";
import type { HarbourView } from "./layers";

interface CelestialBodyProps {
	view: HarbourView;
	/** Position, colour and glow strength from `computeAmbience`. */
	celestial: Celestial;
}

/**
 * The sun or moon and its glow, tracking the day / night arc. Nothing is
 * drawn while the body is at or below the horizon.
 */
function CelestialBody({ view, celestial }: CelestialBodyProps) {
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
				const cR = (celestial.color >> 16) & 0xff;
				const cG = (celestial.color >> 8) & 0xff;
				const cB = celestial.color & 0xff;
				// radial alpha falloff — stacked hard circles read as a disc,
				// not a glow. A full bloom filter is the §7.1 lighting pass.
				g.circle(cx, cy, r * 5).fill(
					new FillGradient({
						type: "radial",
						center: { x: 0.5, y: 0.5 },
						innerRadius: 0,
						outerCenter: { x: 0.5, y: 0.5 },
						outerRadius: 0.5,
						colorStops: [
							{ offset: 0, color: `rgba(${cR},${cG},${cB},${0.55 * glow})` },
							{ offset: 0.45, color: `rgba(${cR},${cG},${cB},${0.12 * glow})` },
							{ offset: 1, color: `rgba(${cR},${cG},${cB},0)` }
						],
						textureSpace: "local"
					})
				);
				g.circle(cx, cy, r).fill({ color: celestial.color, alpha: 0.9 });
			}}
		/>
	);
}

export default CelestialBody;
