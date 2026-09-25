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

/** The strip, and the copies of it that carry the harbour on past its ends: each mirrored, so it picks up where its
 *  neighbour leaves off. Only seen once the camera pulls out (`ZOOM_OUT`). */
const COPIES = [-1, 0, 1];

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
			{COPIES.map(side => {
				// The art is fit to the width of the view, so a copy is a view's width along.
				const copy = { x: bg.x + side * view.width, scale: { x: side === 0 ? bg.scale : -bg.scale, y: bg.scale } };
				return (
					<pixiContainer key={side}>
						<pixiSprite texture={bg.texture} anchor={0.5} x={copy.x} y={bg.y} scale={copy.scale} tint={tint} />
						{lit && windowGlow > 0.01 && (
							<pixiSprite texture={lit} anchor={0.5} x={copy.x} y={bg.y} scale={copy.scale} alpha={alpha} />
						)}
					</pixiContainer>
				);
			})}
		</>
	);
}
