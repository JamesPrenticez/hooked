import {
	KRAKEN_ANIMATIONS,
	KRAKEN_FIGHT,
	KRAKEN_FIGHT_SECONDS,
	KRAKEN_SHEETS,
	krakenFightBeat,
	krakenFrame
} from "@constants/krakenAnimations";

import { krakenBox, krakenGrip } from "./krakenFrames";

interface Size {
	width: number;
	height: number;
}

/** Share of the screen a frame may fill. */
const MAX_WIDTH = 0.9;
const MAX_HEIGHT = 0.5;

/** The fight draws the Kraken this many times bigger than that: huge next to the
 *  hook, and about as tall as the screen. */
const FIGHT_ZOOM = 2;

/** How much of the coil's travel the hook shows on screen; the Kraken slides the
 *  other way for the rest. The yank pulls the coil down further than there's room
 *  above the bottom bar, so left alone the hook would be dragged behind it —
 *  shared out, it stays clear while the Kraken heaves up to meet it. */
const HOOK_FOLLOW = 0.6;

/** Screen height fraction the hook sits at while the coil is mid-frame. The bottom
 *  bar covers the lower half of the screen, so this is high enough that even the
 *  lowest yank keeps the hook above it.
 *  ponytail: the bar's height is assumed, not measured — on a landscape phone it
 *  covers more and the low yanks go behind it; measure the bar if that matters. */
const HOOK_Y = 0.31;

/** Seconds the hook takes to reach the coil as the tentacle closes on it, and
 *  to come free again before the fight ends. */
const GRAB_SECONDS = 0.5;
const RELEASE_SECONDS = 0.4;

const fightSheet = KRAKEN_SHEETS.find(({ id }) => id === KRAKEN_ANIMATIONS[KRAKEN_FIGHT[0]].sheet)!;

/** Scale that fits a frame's box inside `MAX_WIDTH` x `MAX_HEIGHT` of the screen. */
export function krakenFitScale(view: Size, box: Size): number {
	return Math.min((view.width * MAX_WIDTH) / box.width, (view.height * MAX_HEIGHT) / box.height);
}

/**
 * The Kraken's fight, `elapsed` seconds in: which frame of its sheet, how big, where its
 * sprite (anchored on the middle of the frame's box) goes, and where the coil holding the
 * hook is — all in screen px. The Kraken is placed so the coil stays on the hook however
 * the frames move it, the two sharing the coil's travel (`HOOK_FOLLOW`).
 */
export function krakenFightPose(view: Size, elapsed: number) {
	const beat = krakenFightBeat(elapsed);
	const frame = krakenFrame(beat.id, beat.elapsed);
	const scale = FIGHT_ZOOM * krakenFitScale(view, krakenBox(fightSheet.columns, fightSheet.rows));
	const grip = krakenGrip(fightSheet.id, fightSheet.columns, fightSheet.rows, frame);
	const rest = { x: view.width / 2, y: view.height * HOOK_Y };

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
