import { FillGradient } from "pixi.js";

import type { HarbourView } from "./layers";

interface SkyLayerProps {
	view: HarbourView;
	/** Top-of-sky colour from `computeAmbience`. */
	skyTop: number;
	/** Horizon colour from `computeAmbience`. */
	skyHorizon: number;
}

/**
 * `skyTop`/`skyHorizon` drift continuously through the day/night cycle, so
 * unlike the sun/moon/beacon glows (`gradientCache.ts`) this one can't just
 * cache by color — a new value almost every frame means the cache would
 * (almost) never hit. Its canvas is tiny (256×1px) so rebuilding it every
 * frame is cheap; what it can't do is sit there afterwards waiting for
 * Pixi's texture GC to notice — that only sweeps every 30s, and only
 * reclaims a texture once it's been idle 60s, so a fresh one every frame
 * piles up in the meantime. Explicitly destroying the previous one the
 * moment it's replaced (safe: `g.clear()` above already dropped the old
 * geometry that referenced it) keeps at most one alive at a time.
 */
let previousGradient: FillGradient | null = null;

function skyGradient(top: number, horizon: number): FillGradient {
	previousGradient?.destroy();
	previousGradient = new FillGradient({
		type: "linear",
		start: { x: 0, y: 0 },
		end: { x: 0, y: 1 },
		colorStops: [
			{ offset: 0, color: top },
			{ offset: 1, color: horizon }
		],
		textureSpace: "local"
	});
	return previousGradient;
}

/**
 * The vertical sky gradient behind the harbour strip. Colours come from
 * `computeAmbience` and shift across the day / night cycle; this component
 * just paints the fill.
 */
function SkyLayer({ view, skyTop, skyHorizon }: SkyLayerProps) {
	return (
		<pixiGraphics
			draw={g => {
				g.clear();
				g.rect(0, 0, view.width, view.height).fill(skyGradient(skyTop, skyHorizon));
			}}
		/>
	);
}

export default SkyLayer;
