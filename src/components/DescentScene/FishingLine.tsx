import { useEffect, useState } from "react";
import { Assets, type Texture } from "pixi.js";

import hookUrl from "@assets/player/hook.png";
import { useDebugStore } from "@stores/debugStore";
import { useHookStore } from "@stores/hookStore";
import { useKrakenStore } from "@stores/krakenStore";

import { krakenFightPose, krakenHold } from "./krakenFight";
import { hookX, simHookX } from "./lineDrift";

interface FishingLineProps {
	/** Rod tip in world space (`boatLayout`) — the line hangs from it until the hook hits the water. */
	tip: { x: number; y: number };
	/** World y of the hook (`hookWorldY`). */
	hookY: number;
	/** Pixels the world has scrolled up (`cameraScroll`) — turns a screen y into a world y. */
	scroll: number;
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
 * top of the water, moving horizontally. While the Kraken has hold of it
 * (`useKrakenStore`'s `fightStart`) the hook comes off that sweep and rides in
 * its coil instead (`krakenFightPose`), the line following it. The hook is
 * placeholder art.
 */
export function FishingLine({ tip, hookY, scroll, waterY, view, boatScale, seconds }: FishingLineProps) {
	const [hook, setHook] = useState<Texture>();
	const fightStart = useKrakenStore(state => state.fightStart);
	const depthZones = useDebugStore(state => state.depthZones);
	const sim = useHookStore(state => state.sim);

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

	let x = hookX(tip.x, view, hookY - waterY, seconds);
	if (sim) {
		// Manual: the hook is the sim's, eased from under the rod tip over the cast.
		x = simHookX(tip.x, sim.x, sim.depthM, view.width);
	}
	let y = hookY;
	if (fightStart !== undefined) {
		const elapsed = seconds - fightStart;
		const { grip } = krakenFightPose(view, elapsed, depthZones);
		const hold = krakenHold(elapsed);
		x += (grip.x - x) * hold;
		y += (grip.y + scroll - y) * hold;
	}

	return (
		<>
			<pixiGraphics
				draw={g => {
					g.clear();
					g.moveTo(tip.x, tip.y);
					if (y >= waterY) g.lineTo(x, waterY);
					g.lineTo(x, y).stroke({ width: 1.5, color: 0xe8e8e8, alpha: 0.8 });
				}}
			/>
			{hook && (
				<pixiSprite texture={hook} anchor={HOOK_EYE} x={x} y={y} scale={boatScale * HOOK_SCALE_PER_BOAT_SCALE} />
			)}
		</>
	);
}
