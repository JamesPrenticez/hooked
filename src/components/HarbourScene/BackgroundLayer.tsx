import type { Texture } from "pixi.js";

import { tweakProps, useLayout } from "@stores/harbourDebugStore";

import { computeBackgroundFit, computeWideFit } from "./backgroundFit";
import type { HarbourView } from "./layers";

interface BackgroundLayerProps {
	view: HarbourView;
	/** `bg-desktop-wide` / `bg-mobile-wide`; `undefined` until the load resolves. */
	desktopWide?: Texture;
	mobileWide?: Texture;
	/** Day / night multiply tint from `computeAmbience`. */
	tint: number;
}

/**
 * The harbour background strip — real art carrying the buildings, dock and
 * cranes, painted at midday and tinted for the time of day. Picks the
 * desktop or mobile export by viewport shape (see `backgroundFit`).
 */
export function BackgroundLayer({ view, desktopWide, mobileWide, tint }: BackgroundLayerProps) {
	const tweak = useLayout("background", view);
	const landscape = view.width >= view.height;
	const wide = landscape ? desktopWide : mobileWide;
	if (!wide) return null;
	const bg = computeBackgroundFit(view);
	const wideFit = computeWideFit(bg, landscape);

	// Mirrored copies carry the wide art on past its own ends, so the harbour never just stops.
	return (
		<pixiContainer {...tweakProps(tweak, { x: view.width / 2, y: view.height / 2 })}>
			{[-1, 0, 1].map(side => {
				const width = wide.width * wideFit.scale.x;
				return (
					<pixiSprite
						key={side}
						texture={wide}
						x={wideFit.x + side * width + (side === 0 ? 0 : width)}
						y={wideFit.y}
						scale={{
							x: side === 0 ? wideFit.scale.x : -wideFit.scale.x,
							y: wideFit.scale.y
						}}
						tint={tint}
					/>
				);
			})}
		</pixiContainer>
	);
}
