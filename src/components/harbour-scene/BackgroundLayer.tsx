import type { Texture } from "pixi.js";

import { layout, tweakProps } from "@constants/harbourLayout";

import { computeBackgroundFit } from "./backgroundFit";
import type { HarbourView } from "./layers";

interface BackgroundLayerProps {
	view: HarbourView;
	/** `bg-desktop` / `bg-mobile`; `undefined` until the load resolves. */
	desktop?: Texture;
	mobile?: Texture;
}

/**
 * The harbour background — real art carrying the sky, buildings and docks.
 * Picks the desktop or mobile export by viewport shape (see `backgroundFit`).
 */
export function BackgroundLayer({ view, desktop, mobile }: BackgroundLayerProps) {
	const tweak = layout("background", view);
	const landscape = view.width >= view.height;
	const texture = landscape ? desktop : mobile;
	if (!texture) return null;
	const fit = computeBackgroundFit(view, tweak);
	const width = texture.width * fit.scale;
	const left = fit.x - width / 2;
	const top = fit.y - (texture.height * fit.scale) / 2;

	// Mirrored copies carry the art on past its own ends, so the harbour never just stops.
	return (
		<pixiContainer {...tweakProps(tweak, { x: view.width / 2, y: view.height / 2 })}>
			{[-1, 0, 1].map(side => (
				<pixiSprite
					key={side}
					texture={texture}
					x={left + side * width + (side === 0 ? 0 : width)}
					y={top}
					scale={{ x: side === 0 ? fit.scale : -fit.scale, y: fit.scale }}
				/>
			))}
		</pixiContainer>
	);
}
