import { useEffect, useState } from "react";
import { Assets, type Texture } from "pixi.js";

import hookUrl from "@assets/player/hook.png";

import { hookX } from "./lineDrift";

interface FishingLineProps {
	/** Rod tip in world space (`boatLayout`) — the line hangs from it until the hook hits the water. */
	tip: { x: number; y: number };
	/** World y of the hook (`hookWorldY`). */
	hookY: number;
	/** World y of the water surface (`waterlineY`). */
	waterY: number;
	view: { width: number; height: number };
	/** The boat's sprite scale (`boatLayout`) — the hook is sized off it. */
	boatScale: number;
	seconds: number;
}

/** `hook.png` is a 1254px square with the hook drawn small inside it (~1076px
 *  tall). This is its scale relative to the boat's (which is per pixel of a
 *  256px sprite frame), which puts the hook at about a third of the resting
 *  boat's height — ~105px on a 1080p screen. */
const HOOK_SCALE_PER_BOAT_SCALE = 0.055;

/** The eyelet the line ties through, as a fraction of the hook texture. */
const HOOK_EYE = { x: 0.545, y: 0.067 };

/**
 * The line + hook, drawn in the harbour's world space so it scrolls with the
 * camera. Ninja Fishing style: the hook falls straight from the rod tip, and
 * once it's in the water the line runs tip → surface → hook, with the
 * underwater part vertical. The hook then sweeps left and right (`hookX`), the
 * surface point sliding with it — so as the camera pans down, the tip and the
 * diagonal leave the screen and what's left is a vertical line hanging from the
 * top of the water, moving horizontally. The hook is placeholder art.
 */
function FishingLine({ tip, hookY, waterY, view, boatScale, seconds }: FishingLineProps) {
	const [hook, setHook] = useState<Texture>();

	useEffect(() => {
		let live = true;
		// ponytail: loaded on scene mount, not via the boot manifest — same as
		// Mackerel; route through §5's manifest when the asset set is real. The
		// hook is drawn ~9x smaller than its source, so it gets mipmaps.
		Assets.load<Texture>({ src: hookUrl, data: { autoGenerateMipmaps: true } }).then(loaded => {
			if (live) setHook(loaded);
		});
		return () => {
			live = false;
		};
	}, []);

	const x = hookX(tip.x, view, hookY - waterY, seconds);

	return (
		<>
			<pixiGraphics
				draw={g => {
					g.clear();
					g.moveTo(tip.x, tip.y);
					if (hookY >= waterY) g.lineTo(x, waterY);
					g.lineTo(x, hookY).stroke({ width: 1.5, color: 0xe8e8e8, alpha: 0.8 });
				}}
			/>
			{hook && (
				<pixiSprite texture={hook} anchor={HOOK_EYE} x={x} y={hookY} scale={boatScale * HOOK_SCALE_PER_BOAT_SCALE} />
			)}
		</>
	);
}

export default FishingLine;
