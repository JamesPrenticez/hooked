import { FillGradient } from "pixi.js";

/**
 * `waterTop`/`waterBottom` drift every frame while descending, so — like
 * HarbourScene's `SkyLayer` — this rebuilds the gradient each draw rather
 * than caching by colour, and explicitly destroys the previous texture so
 * at most one is ever alive (see `SkyLayer` for why that matters).
 */
let previousGradient: FillGradient | null = null;

function waterGradient(top: number, bottom: number): FillGradient {
	previousGradient?.destroy();
	previousGradient = new FillGradient({
		type: "linear",
		start: { x: 0, y: 0 },
		end: { x: 0, y: 1 },
		colorStops: [
			{ offset: 0, color: top },
			{ offset: 1, color: bottom }
		],
		textureSpace: "local"
	});
	return previousGradient;
}

interface WaterLayerProps {
	view: { width: number; height: number };
	top: number;
	bottom: number;
	/** `0`..`1` dark overlay strength — light falloff with depth. */
	darkness: number;
}

/** The underwater backdrop: a vertical gradient plus a flat dark overlay
 *  that thickens with depth, entirely code-drawn (no water texture). */
function WaterLayer({ view, top, bottom, darkness }: WaterLayerProps) {
	return (
		<pixiContainer>
			<pixiGraphics draw={g => g.clear().rect(0, 0, view.width, view.height).fill(waterGradient(top, bottom))} />
			<pixiGraphics
				draw={g => g.clear().rect(0, 0, view.width, view.height).fill({ color: 0x000000, alpha: darkness })}
			/>
		</pixiContainer>
	);
}

export default WaterLayer;
