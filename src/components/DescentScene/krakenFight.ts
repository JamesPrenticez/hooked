import { depthToScreenY } from "@components/HarbourScene/framing";
import { DEPTH_ZONES, type DepthZone, JACKPOT_DEPTH_METERS, KRAKEN_DEPTH_METERS } from "@constants/depthZones";
import {
	KRAKEN_ANIMATIONS,
	KRAKEN_FIGHT,
	KRAKEN_FIGHT_SECONDS,
	KRAKEN_SHEETS,
	krakenFightBeat,
	krakenFrame
} from "@constants/krakenAnimations";

import { krakenBox, krakenGrip, krakenTop } from "./krakenFrames";

interface Size {
	width: number;
	height: number;
}

/** Share of the screen a frame may fill. */
const MAX_WIDTH = 0.9;
const MAX_HEIGHT = 0.5;

/** The fight draws the Kraken this many times bigger than that: big next to the
 *  hook, yet small enough that all of it fits between the jackpot line and the
 *  bottom bar. */
const FIGHT_ZOOM = 1.2;

/** How much of the coil's travel the hook shows on screen; the Kraken slides the
 *  other way for the rest. The yank pulls the coil down further than there's room
 *  above the bottom bar, so left alone the hook would be dragged behind it —
 *  shared out, it stays clear while the Kraken heaves up to meet it. */
const HOOK_FOLLOW = 0.6;

/** Gap between the jackpot line and the Kraken's highest point, as a share of the
 *  screen height. */
const TOP_PADDING = 0.03;

/** Seconds the hook takes to reach the coil as the tentacle closes on it, and
 *  to come free again before the fight ends. */
const GRAB_SECONDS = 0.5;
const RELEASE_SECONDS = 0.4;

const fightSheet = KRAKEN_SHEETS.find(({ id }) => id === KRAKEN_ANIMATIONS[KRAKEN_FIGHT[0]].sheet)!;

/** How far the art reaches above the coil's resting point at the fight's highest frame, in sheet
 *  pixels. Not just that frame's own top: the Kraken slides `1 - HOOK_FOLLOW` of the coil's travel. */
const FIGHT_RISE = Math.max(
	...KRAKEN_FIGHT.flatMap(id => KRAKEN_ANIMATIONS[id].frames).map(
		frame =>
			(1 - HOOK_FOLLOW) * krakenGrip(fightSheet.id, fightSheet.columns, fightSheet.rows, frame).y -
			krakenTop(fightSheet.id, fightSheet.columns, fightSheet.rows, frame)
	)
);

/** Scale that fits a frame's box inside `MAX_WIDTH` x `MAX_HEIGHT` of the screen. */
export function krakenFitScale(view: Size, box: Size): number {
	return Math.min((view.width * MAX_WIDTH) / box.width, (view.height * MAX_HEIGHT) / box.height);
}

/**
 * Screen y of the Kraken's highest point: `TOP_PADDING` under the jackpot line, wherever the
 * line is by the time the hook has stopped at `KRAKEN_DEPTH_METERS`. On a screen too short to
 * show the line, it's the same gap under the screen's top edge instead.
 */
export function krakenAnchorY(view: Size, zones: DepthZone[] = DEPTH_ZONES): number {
	const jackpotMeters = zones.find(zone => zone.id === "jackpot")?.fromMeters ?? JACKPOT_DEPTH_METERS;
	const lineY = depthToScreenY(jackpotMeters, KRAKEN_DEPTH_METERS, view);
	return Math.max(0, lineY) + TOP_PADDING * view.height;
}

/**
 * The Kraken's fight, `elapsed` seconds in: which frame of its sheet, how big, where its
 * sprite (anchored on the middle of the frame's box) goes, and where the coil holding the
 * hook is — all in screen px. The Kraken is placed so the coil stays on the hook however
 * the frames move it, the two sharing the coil's travel (`HOOK_FOLLOW`), and so its highest
 * point in any frame stays `TOP_PADDING` under the jackpot line (`krakenAnchorY`).
 */
export function krakenFightPose(view: Size, elapsed: number, zones: DepthZone[] = DEPTH_ZONES) {
	const beat = krakenFightBeat(elapsed);
	const frame = krakenFrame(beat.id, beat.elapsed);
	const scale = FIGHT_ZOOM * krakenFitScale(view, krakenBox(fightSheet.columns, fightSheet.rows));
	const grip = krakenGrip(fightSheet.id, fightSheet.columns, fightSheet.rows, frame);
	const rest = { x: view.width / 2, y: krakenAnchorY(view, zones) + FIGHT_RISE * scale };

	return {
		frame,
		scale,
		sprite: {
			x: rest.x - (1 - HOOK_FOLLOW) * grip.x * scale,
			y: rest.y - (1 - HOOK_FOLLOW) * grip.y * scale
		},
		grip: {
			x: rest.x + HOOK_FOLLOW * grip.x * scale,
			y: rest.y + HOOK_FOLLOW * grip.y * scale
		}
	};
}

const smoothstep = (t: number) => {
	const clamped = Math.min(1, Math.max(0, t));
	return clamped * clamped * (3 - 2 * clamped);
};

/** `0..1`: how far the hook has come to the Kraken's coil `elapsed` seconds into the fight —
 *  eased in as the tentacle closes on it, and back out as it lets go at the end. */
export function krakenHold(elapsed: number): number {
	return smoothstep(elapsed / GRAB_SECONDS) * smoothstep((KRAKEN_FIGHT_SECONDS - elapsed) / RELEASE_SECONDS);
}
