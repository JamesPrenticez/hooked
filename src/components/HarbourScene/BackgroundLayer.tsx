import type { Texture } from "pixi.js";

import { computeBackgroundFit } from "./backgroundFit";
import type { HarbourView } from "./layers";

interface BackgroundLayerProps {
	view: HarbourView;
	/** Wide `bg-desktop` export; `undefined` until the load resolves. */
	desktop?: Texture;
	/** 9:16 `bg-mobile` export; `undefined` until the load resolves. */
	mobile?: Texture;
	/** Day / night multiply tint from `computeAmbience`. */
	tint: number;
}

/**
 * The harbour background strip — real art carrying the buildings, dock and
 * cranes, painted at midday and tinted for the time of day. Picks the
 * desktop or mobile export by viewport shape (see `backgroundFit`).
 */
function BackgroundLayer({ view, desktop, mobile, tint }: BackgroundLayerProps) {
	if (!desktop || !mobile) return null;
	const bg = computeBackgroundFit(view, desktop, mobile);
	return <pixiSprite texture={bg.texture} anchor={0.5} x={bg.x} y={bg.y} scale={bg.scale} tint={tint} />;
}

export default BackgroundLayer;
