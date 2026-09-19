import { useEffect, useState } from "react";
import { Assets, type Texture } from "pixi.js";

import hookUrl from "@assets/player/hook.png";
import { castProgress } from "@components/HarbourScene/framing";

import { lineDrift } from "./lineDrift";

interface FishingLineProps {
	/** Rod tip in world space (`boatLayout`) — the line always hangs from it. */
	tip: { x: number; y: number };
	/** World y of the hook (`hookWorldY`). */
	hookY: number;
	viewWidth: number;
	/** The boat's sprite scale (`boatLayout`) — the hook is sized off it. */
	boatScale: number;
	depth: number;
	seconds: number;
}

/** How far `lineDrift`'s `-1..1` swings the line, as a fraction of the
 *  screen width either side of centre. */
const DRIFT_FRACTION = 0.35;

/** `hook.png` is a 1254px square with the hook drawn small inside it (~1076px
 *  tall). This is its scale relative to the boat's, which puts the hook at
 *  about a third of the boat's height — ~110px on a 1080p screen. */
const HOOK_SCALE_PER_BOAT_SCALE = 0.3;

/** The eyelet the line ties through, as a fraction of the hook texture. */
const HOOK_EYE = { x: 0.545, y: 0.067 };

/**
 * The line + hook, drawn in the harbour's world space so it hangs from the rod
 * tip and scrolls with the camera as the descent starts. The line is straight
 * and taut, not swaying: the hook starts under the rod tip and, as the cast
 * plays out, eases over to `lineDrift`'s slow left/right wander. The hook is
 * placeholder art.
 */
function FishingLine({ tip, hookY, viewWidth, boatScale, depth, seconds }: FishingLineProps) {
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

	const drifted = viewWidth / 2 + lineDrift(seconds) * viewWidth * DRIFT_FRACTION;
	const cast = castProgress(depth);
	const hookX = tip.x + (drifted - tip.x) * cast;

	return (
		<>
			<pixiGraphics
				draw={g => {
					g.clear();
					g.moveTo(tip.x, tip.y).lineTo(hookX, hookY).stroke({ width: 1.5, color: 0xe8e8e8, alpha: 0.8 });
				}}
			/>
			{hook && (
				<pixiSprite
					texture={hook}
					anchor={HOOK_EYE}
					x={hookX}
					y={hookY}
					scale={boatScale * HOOK_SCALE_PER_BOAT_SCALE}
				/>
			)}
		</>
	);
}

export default FishingLine;
