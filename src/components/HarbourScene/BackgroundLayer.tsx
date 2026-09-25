import type { Texture } from "pixi.js";

import { computeBackgroundFit, computeWideFit } from "./backgroundFit";
import type { HarbourView } from "./layers";
import { windowFlicker } from "./windowFlicker";

interface BackgroundLayerProps {
	view: HarbourView;
	/** Wide `bg-desktop` export; `undefined` until the load resolves. */
	desktop?: Texture;
	/** 9:16 `bg-mobile` export; `undefined` until the load resolves. */
	mobile?: Texture;
	/** `bg-desktop-wide` / `bg-mobile-wide`: the same harbour drawn further back, running on past the edges of the
	 *  standard exports — what is seen either side once the camera pulls out. Optional. */
	desktopWide?: Texture;
	mobileWide?: Texture;
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
	desktopWide,
	mobileWide,
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

	const wide = landscape ? desktopWide : mobileWide;
	const wideFit = computeWideFit(bg, landscape);

	return (
		<>
			{wide && (
				// Mirrored copies carry the wide art on past its own ends, so the harbour never just stops.
				<>
					{[-1, 0, 1].map(side => {
						const width = wide.width * wideFit.scale.x;
						return (
							<pixiSprite
								key={side}
								texture={wide}
								x={wideFit.x + side * width + (side === 0 ? 0 : width)}
								y={wideFit.y}
								scale={{ x: side === 0 ? wideFit.scale.x : -wideFit.scale.x, y: wideFit.scale.y }}
								tint={tint}
							/>
						);
					})}
				</>
			)}
			<pixiSprite texture={bg.texture} anchor={0.5} x={bg.x} y={bg.y} scale={bg.scale} tint={tint} />
			{lit && windowGlow > 0.01 && (
				<pixiSprite texture={lit} anchor={0.5} x={bg.x} y={bg.y} scale={bg.scale} alpha={alpha} />
			)}
		</>
	);
}
