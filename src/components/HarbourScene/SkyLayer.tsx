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
 * The vertical sky gradient behind the harbour strip. Colours come from
 * `computeAmbience` and shift across the day / night cycle; this component
 * just paints the fill.
 */
function SkyLayer({ view, skyTop, skyHorizon }: SkyLayerProps) {
	return (
		<pixiGraphics
			draw={g => {
				g.clear();
				g.rect(0, 0, view.width, view.height).fill(
					new FillGradient({
						type: "linear",
						start: { x: 0, y: 0 },
						end: { x: 0, y: 1 },
						colorStops: [
							{ offset: 0, color: skyTop },
							{ offset: 1, color: skyHorizon }
						],
						textureSpace: "local"
					})
				);
			}}
		/>
	);
}

export default SkyLayer;
