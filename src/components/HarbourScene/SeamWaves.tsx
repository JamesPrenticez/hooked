import type { Texture } from "pixi.js";

import { waterlineY } from "./framing";
import { type HarbourView, OVERSCAN } from "./layers";
import { waterSwell } from "./waterSwell";

/** Where the foam line sits on `seam.png`, as a fraction of its height. */
const FOAM_Y = 0.4;

/**
 * Two additive passes of the same wavelet strip, at different sizes and drift
 * so they slide over each other. `height` is the strip's share of the screen
 * height — small, so these read as mini waves rather than swell.
 */
const PASSES = [
	{ alpha: 0.9, height: 0.1, drift: 7, swellPhase: 1.2 },
	{ alpha: 0.5, height: 0.065, drift: -11, swellPhase: 3.3 }
];

interface SeamWavesProps {
	view: HarbourView;
	/** Day / night multiply tint from `computeAmbience`. */
	tint: number;
	/** Horizontally tileable wave strip on black (`seam.png`); nothing renders
	 *  until it loads. */
	texture?: Texture;
	/** Wall-clock seconds (`useElapsedSeconds`), driving the drift and bob. */
	seconds: number;
	/** World y of the water’s surface: the waterline at rest, dropping away as a landing pulls the camera back. */
	surface?: number;
}

/** Hides the join between the harbour water and the underwater: a row of small
 *  wave crests centred on the waterline, drawn additively so the strip's black
 *  vanishes and only the foam and teal body show over both. */
export function SeamWaves({ view, tint, texture, seconds, surface }: SeamWavesProps) {
	if (!texture) return null;
	const waterline = surface ?? waterlineY(view);
	const left = -view.width * OVERSCAN;

	return (
		<pixiContainer>
			{PASSES.map(pass => {
				const scale = (view.height * pass.height) / texture.height;
				return (
					<pixiTilingSprite
						key={pass.swellPhase}
						texture={texture}
						x={left}
						y={waterline - FOAM_Y * texture.height * scale + waterSwell(seconds, pass.swellPhase)}
						width={view.width * (1 + 2 * OVERSCAN)}
						height={texture.height * scale}
						tileScale={{ x: scale, y: scale }}
						// The tiles stay where they were with the sprite's left edge out past the screen's.
						tilePosition={{ x: seconds * pass.drift - left, y: 0 }}
						blendMode="add"
						alpha={pass.alpha}
						tint={tint}
					/>
				);
			})}
		</pixiContainer>
	);
}
