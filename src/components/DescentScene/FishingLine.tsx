import { useEffect, useState } from "react";
import { Assets, type Texture } from "pixi.js";

import hookUrl from "@assets/player/hook.png";

import { lineDrift } from "./lineDrift";

interface FishingLineProps {
	view: { width: number; height: number };
	depth: number;
	seconds: number;
}

/** Depth at which the line has fully paid out to its resting length — past
 *  this the hook holds and the parallax layers behind it keep scrolling to
 *  sell the continued descent (BUILD_PLAN §13.2 "camera follows hook", without
 *  an actual camera). */
const PAYOUT_METERS = 150;

/** How far `lineDrift`'s `-1..1` swings the line, as a fraction of the
 *  screen width either side of centre. */
const DRIFT_FRACTION = 0.35;

/** `hook.png` is a 1254px square with the hook drawn small inside it (~1076px
 *  tall), so this puts the hook at about 110px tall on screen. */
const HOOK_SCALE = 0.1;

/** The eyelet the line ties through, as a fraction of the hook texture. */
const HOOK_EYE = { x: 0.545, y: 0.067 };

/**
 * The line + hook — the only part of the rig still visible once it's in the
 * water (the boat/player/rod stay in HarbourScene, at the surface). The line is
 * drawn straight and taut, not swaying: the whole line drifts left/right
 * together from an anchor point above the top edge, per `lineDrift`, with the
 * hook sprite hanging from its end. The hook is placeholder art.
 */
function FishingLine({ view, depth, seconds }: FishingLineProps) {
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

	const payout = Math.min(depth / PAYOUT_METERS, 1);
	const restY = view.height * 0.5;
	const x = view.width / 2 + lineDrift(seconds) * view.width * DRIFT_FRACTION;
	const hookY = restY * payout;

	return (
		<>
			<pixiGraphics
				draw={g => {
					g.clear();
					g.moveTo(x, 0).lineTo(x, hookY).stroke({ width: 1.5, color: 0xe8e8e8, alpha: 0.8 });
				}}
			/>
			{hook && <pixiSprite texture={hook} anchor={HOOK_EYE} x={x} y={hookY} scale={HOOK_SCALE} />}
		</>
	);
}

export default FishingLine;
