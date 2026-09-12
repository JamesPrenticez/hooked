import { Color, FillGradient } from "pixi.js";

import { bucketColor, cachedGradient } from "./gradientCache";
import type { TowerLandmark } from "./towerLandmarks";

interface TowerBeaconProps {
	/** Texture-space landmark for the active background variant (see
	 *  `towerLandmarks.ts`). */
	landmark: TowerLandmark;
	/** Maps a texture-space point to screen space — `textureToScreen`
	 *  partially applied to the active `BackgroundFit`. */
	toScreen: (point: { x: number; y: number }) => { x: number; y: number };
	/** Background sprite scale, so the glow sizes with the art. */
	scale: number;
	/** `0`..`1` visibility — follows the same day/night gate as the window
	 *  lights, so the beacon only runs after dark. */
	alpha: number;
	/** Wall-clock seconds (`useElapsedSeconds`), driving the colour cycle. */
	seconds: number;
}

/** Degrees of hue per second — a full rainbow cycle every 9s. */
const CYCLE_SPEED = 40;

/** The hue cycles through the same 360° loop forever — a bounded palette,
 *  so caching by (bucketed) RGB plateaus instead of growing. See
 *  `gradientCache` for why this is cached at all. */
const haloGradientCache = new Map<string, FillGradient>();

function haloGradient(color: number): FillGradient {
	const [r, g, b] = bucketColor(color);
	return cachedGradient(
		haloGradientCache,
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
				// bilinear-scales this up over the halo's radius fine.
				textureSize: 64,
				colorStops: [
					{ offset: 0, color: `rgba(${rgb},0.6)` },
					{ offset: 1, color: `rgba(${rgb},0)` }
				],
				textureSpace: "local"
			})
	);
}

/**
 * The Skytree antenna beacon: a single colour-cycling tip light. Code-driven,
 * not art — only the landmark pixel coordinates come from the background
 * image.
 */
function TowerBeacon({ landmark, toScreen, scale, alpha, seconds }: TowerBeaconProps) {
	if (alpha <= 0.02) return null;

	const tip = toScreen({ x: landmark.x, y: landmark.tipY });
	const hue = (seconds * CYCLE_SPEED) % 360;
	const color = new Color({ h: hue, s: 85, l: 62 }).toNumber();
	const r = 3 * scale;

	return (
		<pixiGraphics
			blendMode="add"
			alpha={alpha}
			draw={g => {
				g.clear();
				// soft halo around the tip — same falloff trick as the sun/moon
				g.circle(tip.x, tip.y, r * 6).fill(haloGradient(color));
				// bright core
				g.circle(tip.x, tip.y, r).fill({ color, alpha: 0.95 });
			}}
		/>
	);
}

export default TowerBeacon;
