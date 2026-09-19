import type { Texture } from "pixi.js";

import type { Celestial } from "./ambience";
import { HORIZON_Y, waterlineY } from "./framing";
import { HARBOUR_LAYERS, type HarbourView } from "./layers";
import WaterReflections from "./WaterReflections";
import { waterSwell } from "./waterSwell";

const ocean = HARBOUR_LAYERS.find(layer => layer.id === "ocean");

/**
 * Three passes of the same tile, each at its own scale / drift vector /
 * swell phase / opacity. A single tiling sprite is one rigid sheet — however
 * it's animated, the whole rectangle moves together. Stacking a few
 * differently-scaled, differently-timed copies makes the overlaps read as
 * independent chop instead, without a wave-physics simulation: cheap, and
 * the water is small and half-obscured by the dock in this scene, so it
 * doesn't need to hold up to a close, static look. (`tileScale` is for the
 * 1024px tile.)
 */
const LAYERS = [
	{ alpha: 1, tileScale: 0.5, driftX: 1.5, driftY: 4, swellPhase: 0, swellAmp: 1 },
	{ alpha: 0.5, tileScale: 0.85, driftX: -2.2, driftY: 2.6, swellPhase: 2.4, swellAmp: 0.6 },
	{ alpha: 0.35, tileScale: 0.3, driftX: 3.1, driftY: -1.8, swellPhase: 4.1, swellAmp: 0.8 }
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
	/** Position, colour and glow strength from `computeAmbience` — the moon /
	 *  sun glint's source. */
	celestial: Celestial;
	/** `0`..`1` overlay strength from `computeAmbience` — the waterline's
	 *  lit-building glow. */
	windowGlow: number;
}

/**
 * The harbour's water — the middle third, from the docks' horizon down to the
 * waterline where the underwater begins. Real art is one seamless tile behind
 * the background strip's transparent lower zone, drawn as `LAYERS` stacked
 * copies so the surface doesn't read as one rigid sheet — see its comment.
 * Until the texture loads, the flat placeholder from `layers.ts` fills the
 * same band.
 * `WaterReflections` adds the moon / building-light shine on top either way.
 */
function OceanLayer({ view, tint, texture, seconds, celestial, windowGlow }: OceanLayerProps) {
	const baseTop = view.height * HORIZON_Y;
	const bottom = waterlineY(view);
	const reflections = (
		<WaterReflections
			view={view}
			celestial={celestial}
			windowGlow={windowGlow}
			waterTop={baseTop}
			waterBottom={bottom}
			seconds={seconds}
		/>
	);

	if (texture) {
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
							height={bottom - top}
							tileScale={{ x: layer.tileScale, y: layer.tileScale }}
							tilePosition={{ x: seconds * layer.driftX, y: seconds * layer.driftY }}
							tint={tint}
							alpha={layer.alpha}
						/>
					);
				})}
				{reflections}
			</pixiContainer>
		);
	}

	if (!ocean) return null;
	return (
		<pixiContainer>
			<pixiGraphics tint={tint} draw={g => ocean.draw(g.clear(), view)} />
			{reflections}
		</pixiContainer>
	);
}

export default OceanLayer;
