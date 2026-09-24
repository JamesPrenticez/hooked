import type { Texture } from "pixi.js";

import { computeBackgroundFit } from "./backgroundFit";
import type { HarbourView } from "./layers";
import { windowFlicker } from "./windowFlicker";

interface BackgroundLayerProps {
	view: HarbourView;
	/** Wide `bg-desktop` export; `undefined` until the load resolves. */
	desktop?: Texture;
	/** 9:16 `bg-mobile` export; `undefined` until the load resolves. */
	mobile?: Texture;
	/** Day / night multiply tint from `computeAmbience`. */
	tint: number;
	/** Lit-windows overlay matching `desktop` pixel-for-pixel — transparent
	 *  except the windows, painted lit. Optional: renders nothing extra
	 *  until this art exists. */
	litDesktop?: Texture;
	/** Lit-windows overlay matching `mobile`, same contract as `litDesktop`. */
	litMobile?: Texture;
	/** `0`..`1` overlay strength from `computeAmbience` — `0` by day. */
	windowGlow: number;
	/** Wall-clock seconds (`useElapsedSeconds`), driving the light flicker. */
	seconds: number;
}

/**
 * The harbour background strip — real art carrying the buildings, dock and
 * cranes, painted at midday and tinted for the time of day. Picks the
 * desktop or mobile export by viewport shape (see `backgroundFit`), then
 * stacks the matching lit-windows overlay on top, faded in by `windowGlow`.
 */
export function BackgroundLayer({
	view,
	desktop,
	mobile,
	tint,
	litDesktop,
	litMobile,
	windowGlow,
	seconds
}: BackgroundLayerProps) {
	if (!desktop || !mobile) return null;
	const bg = computeBackgroundFit(view, desktop, mobile);
	const landscape = view.width >= view.height;
	const lit = landscape ? litDesktop : litMobile;
	const alpha = Math.min(1, windowGlow * windowFlicker(seconds));

	return (
		<>
			<pixiSprite texture={bg.texture} anchor={0.5} x={bg.x} y={bg.y} scale={bg.scale} tint={tint} />
			{lit && windowGlow > 0.01 && (
				<pixiSprite texture={lit} anchor={0.5} x={bg.x} y={bg.y} scale={bg.scale} alpha={alpha} />
			)}
		</>
	);
}
