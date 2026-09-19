import { useEffect, useState } from "react";
import { Assets, type Texture } from "pixi.js";

import causticsUrl from "@assets/layers/hub/water/underwater-caustics.webp";
import shaftsUrl from "@assets/layers/hub/water/underwater-shafts.webp";
import { waterlineY } from "@components/HarbourScene/framing";

import type { DepthAmbience } from "./depthAmbience";

/**
 * Each tile is drawn twice, at different scales, drift vectors and parallax,
 * so the copies read as separate layers of water instead of one rigid sheet —
 * the same trick as the harbour's `OceanLayer`. They add light on top of
 * `WaterLayer`'s gradient, so `alpha` is the pass's strength at the surface
 * and `strength` names the `DepthAmbience` field that fades it with depth.
 * `parallax` is how fast the pattern scrolls relative to the world (`1` is
 * pinned to it) — what sells the descent once the surface has left the screen.
 * Drift is in px/s; a positive `y` sinks.
 */
const PASSES = [
	{
		id: "caustics-wide",
		url: causticsUrl,
		strength: "caustics",
		alpha: 0.12,
		tileScale: 0.9,
		drift: { x: 6, y: 3 },
		parallax: 0.2
	},
	{
		id: "caustics-fine",
		url: causticsUrl,
		strength: "caustics",
		alpha: 0.08,
		tileScale: 0.6,
		drift: { x: -4, y: 2.5 },
		parallax: 0.35
	},
	{
		id: "shafts-far",
		url: shaftsUrl,
		strength: "shafts",
		alpha: 0.5,
		tileScale: 1,
		drift: { x: 3, y: 8 },
		parallax: 0.6
	},
	{
		id: "shafts-near",
		url: shaftsUrl,
		strength: "shafts",
		alpha: 0.4,
		tileScale: 0.7,
		drift: { x: -2, y: 14 },
		parallax: 1
	}
] as const;

// Every pass draws its tile well under 1024px, so mipmaps keep the fine
// caustic lines and particles from shimmering as they drift.
const mipmapped = (src: string) => ({ src, data: { autoGenerateMipmaps: true } });

interface WaterTilesProps {
	view: { width: number; height: number };
	/** Screen y of the water's top edge — same as `WaterLayer`'s. */
	y: number;
	/** `cameraScroll` for the current depth. */
	scroll: number;
	ambience: DepthAmbience;
	/** Day / night multiply tint from the harbour's `computeAmbience`. */
	tint: number;
	/** Wall-clock seconds (`useElapsedSeconds`), driving the drift. */
	seconds: number;
}

/** The underwater's surface detail — caustics near the top, light shafts and
 *  drifting particles all the way down — drawn additively over `WaterLayer`.
 *  Nothing renders until the two tiles load. */
function WaterTiles({ view, y, scroll, ambience, tint, seconds }: WaterTilesProps) {
	const [textures, setTextures] = useState<Record<string, Texture>>();

	useEffect(() => {
		let live = true;
		// ponytail: loaded on scene mount, not via the boot manifest — same as
		// HarbourScene; route through §5's manifest when the asset set is real.
		Assets.load([mipmapped(causticsUrl), mipmapped(shaftsUrl)]).then(loaded => {
			if (live) setTextures(loaded);
		});
		return () => {
			live = false;
		};
	}, []);

	if (!textures) return null;

	return (
		<pixiContainer>
			{PASSES.map(pass => {
				const alpha = pass.alpha * ambience[pass.strength];
				return (
					<pixiTilingSprite
						key={pass.id}
						texture={textures[pass.url]}
						y={y}
						width={view.width}
						height={view.height - y}
						tileScale={{ x: pass.tileScale, y: pass.tileScale }}
						// Relative to the sprite, which hangs from `y`: the tile's origin sits
						// on the waterline at rest, then rises at `parallax` × the camera.
						tilePosition={{
							x: seconds * pass.drift.x,
							y: seconds * pass.drift.y + waterlineY(view) - pass.parallax * scroll - y
						}}
						blendMode="add"
						alpha={alpha}
						// Too faint to see this deep, so skip the full-screen pass.
						visible={alpha > 0.01}
						tint={tint}
					/>
				);
			})}
		</pixiContainer>
	);
}

export default WaterTiles;
