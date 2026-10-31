import { depthToScreenY, HOOK_REST_Y } from "@components/harbour-scene/framing";
import { DEPTH_ZONES, type DepthZone, JACKPOT_DEPTH_METERS, KRAKEN_DEPTH_METERS } from "@constants/depthZones";
import {
	KRAKEN_ANIMATIONS,
	KRAKEN_FIGHT,
	KRAKEN_FIGHT_SECONDS,
	KRAKEN_SHEETS,
	KRAKEN_SWIM,
	KRAKEN_SWIM_SECONDS,
	krakenFightBeat,
	krakenFrame
} from "@constants/krakenAnimations";
import { SIM_WIDTH } from "@utils/simConfig";

import { krakenBox, krakenGrip, krakenTop, SWIM_MOUTH } from "./krakenFrames";

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
const swimSheet = KRAKEN_SHEETS.find(({ id }) => id === KRAKEN_ANIMATIONS[KRAKEN_SWIM].sheet)!;
export const SWIM_BOX = krakenBox(swimSheet.columns, swimSheet.rows);

/** Seconds for the swim to go once across the trench and back. */
const SWIM_PERIOD_SECONDS = 3;

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
	const rest = {
		x: view.width / 2,
		y: krakenAnchorY(view, zones) + FIGHT_RISE * scale
	};

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

/**
 * The swim, `elapsed` seconds in: the Kraken goes back and forth across the screen, turning at each side, with the
 * hook in its beak (`grip`). It starts and ends in the middle, and sits where the fit puts a still Kraken. Same
 * shape as `krakenFightPose`, but the sprite faces right and is mirrored (`facing`) to swim left.
 */
export function krakenSwimPose(view: Size, elapsed: number, zones: DepthZone[] = DEPTH_ZONES) {
	const scale = krakenFitScale(view, SWIM_BOX);
	const angle = (2 * Math.PI * Math.min(elapsed, KRAKEN_SWIM_SECONDS)) / SWIM_PERIOD_SECONDS;
	const facing = Math.cos(angle) >= 0 ? 1 : -1;
	const sprite = {
		x: view.width / 2 + (Math.max(0, view.width - SWIM_BOX.width * scale) / 2) * Math.sin(angle),
		y: krakenAnchorY(view, zones) + (SWIM_BOX.height * scale) / 2
	};

	return {
		frame: krakenFrame(KRAKEN_SWIM, elapsed),
		scale,
		facing,
		sprite,
		grip: {
			x: sprite.x + facing * SWIM_MOUTH.x * SWIM_BOX.width * scale,
			y: sprite.y + SWIM_MOUTH.y * SWIM_BOX.height * scale
		}
	};
}

/** Where the hook hangs once the Kraken has let go of it (`FishingLine`'s own position), on screen: `x` is the sim's,
 *  `y` the hook's resting place, and the beak goes `mouthDy` below the line's end. */
export const hookedMouth = (view: Size, simX: number, mouthDy: number) => ({
	x: (simX / SIM_WIDTH) * view.width,
	y: HOOK_REST_Y * view.height + mouthDy
});

/** How much of the screen's height the hooked Kraken hangs down, at most. */
const HANG_HEIGHT = 0.4;

/**
 * The hooked beat, `elapsed` seconds into it: the Kraken lets go of the swim, turns head-up and hangs from the hook
 * by its beak (`mouth`, as `HookedKraken` has it when landed), swinging as it struggles. The hook slides to `mouth`
 * over the same `RELEASE_SECONDS` (`krakenHold`), so the two stay together.
 */
export function krakenHungPose(
	view: Size,
	elapsed: number,
	mouth: { x: number; y: number },
	zones: DepthZone[] = DEPTH_ZONES
) {
	const swum = krakenSwimPose(view, KRAKEN_SWIM_SECONDS, zones);
	const u = smoothstep(elapsed / RELEASE_SECONDS);
	const scale = swum.scale + (Math.min(swum.scale, (HANG_HEIGHT * view.height) / SWIM_BOX.width) - swum.scale) * u;
	const rotation = (-Math.PI / 2) * u;
	const beak = {
		x: swum.grip.x + (mouth.x - swum.grip.x) * u,
		y: swum.grip.y + (mouth.y - swum.grip.y) * u
	};
	// The beak is `SWIM_MOUTH` from the sprite's middle; the turn takes that offset round with it.
	const dx = SWIM_MOUTH.x * SWIM_BOX.width * scale;
	const dy = SWIM_MOUTH.y * SWIM_BOX.height * scale;

	return {
		frame: krakenFrame(KRAKEN_SWIM, KRAKEN_SWIM_SECONDS + elapsed),
		scale,
		rotation,
		beak,
		sprite: {
			x: beak.x - (dx * Math.cos(rotation) - dy * Math.sin(rotation)),
			y: beak.y - (dx * Math.sin(rotation) + dy * Math.cos(rotation))
		},
		sway: Math.sin(elapsed * 11) * 0.12 * u
	};
}

/** Where the Kraken has the hook `elapsed` seconds into the encounter — the fight, then the swim. */
export function krakenHookAt(view: Size, elapsed: number, zones: DepthZone[] = DEPTH_ZONES) {
	return (
		elapsed < KRAKEN_FIGHT_SECONDS
			? krakenFightPose(view, elapsed, zones)
			: krakenSwimPose(view, elapsed - KRAKEN_FIGHT_SECONDS, zones)
	).grip;
}

const smoothstep = (t: number) => {
	const clamped = Math.min(1, Math.max(0, t));
	return clamped * clamped * (3 - 2 * clamped);
};

/** `0..1`: how far the hook has come to the Kraken's coil `elapsed` seconds into the encounter —
 *  eased in as the tentacle closes on it, and back out as it lets go once it is hooked. */
export function krakenHold(elapsed: number): number {
	const end = KRAKEN_FIGHT_SECONDS + KRAKEN_SWIM_SECONDS;
	return smoothstep(elapsed / GRAB_SECONDS) * smoothstep((end + RELEASE_SECONDS - elapsed) / RELEASE_SECONDS);
}
