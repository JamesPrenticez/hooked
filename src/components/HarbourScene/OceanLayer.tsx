import type { Texture } from "pixi.js";

import { HARBOUR_LAYERS, type HarbourView } from "./layers";
import { waterSwell } from "./waterSwell";

const ocean = HARBOUR_LAYERS.find(layer => layer.id === "ocean");

/**
 * Three passes of the same tile, each at its own scale / drift vector /
 * swell phase / opacity. A single tiling sprite is one rigid sheet — however
 * it's animated, the whole rectangle moves together. Stacking a few
 * differently-scaled, differently-timed copies makes the overlaps read as
 * independent chop instead, without a wave-physics simulation: cheap, and
 * the water is small and half-obscured by the dock in this scene, so it
 * doesn't need to hold up to a close, static look.
 */
const LAYERS = [
	{ alpha: 1, tileScale: 1, driftX: 1.5, driftY: 4, swellPhase: 0, swellAmp: 1 },
	{ alpha: 0.5, tileScale: 1.7, driftX: -2.2, driftY: 2.6, swellPhase: 2.4, swellAmp: 0.6 },
	{ alpha: 0.35, tileScale: 0.6, driftX: 3.1, driftY: -1.8, swellPhase: 4.1, swellAmp: 0.8 }
];

interface OceanLayerProps {
	view: HarbourView;
	/** Day / night multiply tint from `computeAmbience`. */
	tint: number;
	/** Seamless water tile (docs/ASSETS.md); `undefined` until it loads, or
	 *  forever if it's never supplied — the flat placeholder still renders. */
	texture?: Texture;
	/** Wall-clock seconds (`useElapsedSeconds`), driving the scroll. */
	seconds: number;
}

/**
 * The harbour's water. Real art is one seamless tile behind the background
 * strip's transparent lower zone, drawn as `LAYERS` stacked copies so the
 * surface doesn't read as one rigid sheet — see its comment. Until the
 * texture loads, the flat placeholder from `layers.ts` fills the same band.
 */
function OceanLayer({ view, tint, texture, seconds }: OceanLayerProps) {
	if (texture) {
		const baseTop = view.height * 0.52; // HORIZON_Y, layers.ts
		return (
			<pixiContainer>
				{LAYERS.map(layer => {
					const top = baseTop + waterSwell(seconds, layer.swellPhase) * layer.swellAmp;
					return (
						<pixiTilingSprite
							key={layer.swellPhase}
							texture={texture}
							x={0}
							y={top}
							width={view.width}
							height={view.height - top}
							tileScale={{ x: layer.tileScale, y: layer.tileScale }}
							tilePosition={{ x: seconds * layer.driftX, y: seconds * layer.driftY }}
							tint={tint}
							alpha={layer.alpha}
						/>
					);
				})}
			</pixiContainer>
		);
	}

	if (!ocean) return null;
	return <pixiGraphics tint={tint} draw={g => ocean.draw(g.clear(), view)} />;
}

export default OceanLayer;
