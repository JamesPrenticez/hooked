import type { Texture } from "pixi.js";

import { computeBackgroundFit, textureToScreen } from "./backgroundFit";
import type { HarbourView } from "./layers";
import { waterSwell } from "./waterSwell";

/**
 * Where the boat sits in each background export — the centre and width of its
 * image box as fractions of the art, so it survives a re-export at another
 * resolution. The two strips have differently shaped water gaps, so each gets
 * its own spot.
 *
 * ponytail: hand-placed against the current strips (fisherman clear of the far
 * pier, hull behind the near dock) — retune if the gap's shape changes.
 */
const BOAT_SPOT = {
	desktop: { x: 0.41, y: 0.72, width: 0.3 },
	mobile: { x: 0.41, y: 0.78, width: 0.6 }
};

interface FishermanProps {
	view: HarbourView;
	/** The two background exports, only used to pin the boat to the same fit
	 *  the strip is drawn with; `undefined` until they load. */
	desktop?: Texture;
	mobile?: Texture;
	/** `player.png` — boat, fisherman and rod as one still. */
	texture?: Texture;
	/** Day / night multiply tint from `computeAmbience`. */
	tint: number;
	/** Wall-clock seconds (`useElapsedSeconds`), driving the bob. */
	seconds: number;
}

/**
 * The fisherman in his boat (BUILD_PLAN §7.2) — one placeholder still, pinned
 * to the background art so it holds its place on the water at any aspect.
 * Drawn between the ocean and the strip, so the strip's foreground dock hides
 * the hull's lower half. Bobs on the same `waterSwell` as the water surface.
 */
function Fisherman({ view, desktop, mobile, texture, tint, seconds }: FishermanProps) {
	if (!desktop || !mobile || !texture) return null;

	const fit = computeBackgroundFit(view, desktop, mobile);
	const spot = fit.texture === desktop ? BOAT_SPOT.desktop : BOAT_SPOT.mobile;
	const { x, y } = textureToScreen(fit, { x: spot.x * fit.texture.width, y: spot.y * fit.texture.height });
	const scale = (spot.width * fit.texture.width * fit.scale) / texture.width;

	return <pixiSprite texture={texture} anchor={0.5} x={x} y={y + waterSwell(seconds)} scale={scale} tint={tint} />;
}

export default Fisherman;
