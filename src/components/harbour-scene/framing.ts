import { PX_PER_METER } from "@constants/depthZones";

interface Size {
	width: number;
	height: number;
}

/**
 * The screen is split in thirds — top: sky, city and docks; middle: the boat
 * on the harbour water; bottom: the underwater. `HORIZON_Y` is where the
 * docks meet the water, `WATERLINE_Y` where the boat floats and the
 * underwater begins. Both are fractions of the screen height.
 */
export const HORIZON_Y = 1 / 3;
export const WATERLINE_Y = 2 / 3;

/** How far the wide desktop art sits below the top-third horizon, as a fraction
 *  of screen height. The water starts where its docks end, so `horizonY` moves
 *  with it. */
export const DESKTOP_DROP = 0.2;

/** Screen y where the docks meet the water. */
export function horizonY(view: Size): number {
	return view.height * (HORIZON_Y + (view.width >= view.height ? DESKTOP_DROP : 0));
}

/** Screen height fraction the hook rests at once the descent is under way. */
const HOOK_REST_Y = 0.5;

/** Metres over which the cast plays out: the hook falls from the rod tip to
 *  its resting height, and the camera pans from the harbour down into the
 *  water. At the default shallow speed (220 m/s) that's about a second and a
 *  half. */
export const CAST_METERS = 300;

/** Every frame of the fisherman is cut into this box (`playerFrames.ts`), in
 *  sheet pixels, with the hull centred on it and its bottom edge on `HULL_Y` —
 *  so the boat sits still while the animations play. Tall enough for the
 *  highest pose (cast, jump), wide enough for the rod tip past the stern. */
export const PLAYER_FRAME = { width: 280, height: 240 };
export const HULL_Y = 236;

/** The point in that box that sits on the waterline: the hull's centre, a touch
 *  above its bottom edge so the underside dips into the water. */
export const BOAT_ANCHOR = { x: 0.5, y: (HULL_Y - 2) / PLAYER_FRAME.height };
/** How tall the resting (idle) pose is above that point, in sheet pixels — what
 *  `BOAT_MAX_HEIGHT` fits to the middle third. The cast, battle and jump poses
 *  reach higher and may rise into the docks. */
export const REST_HEIGHT = 190;
/** Rod tip in the idle pose, as a fraction of the box. */
const ROD_TIP = { x: 269 / PLAYER_FRAME.width, y: 79 / PLAYER_FRAME.height };
/** Where the rod tip sits in the animations that hold it elsewhere, as sheet px from `ROD_TIP` — measured by eye off the
 *  sheet, so good to a few px. Everything else keeps it where the idle pose does. */
const ROD_TIP_SHIFT: Record<string, { x: number; y: number }> = { reel: { x: -11, y: -47 } };
export const rodTipShift = (animation: string) => ROD_TIP_SHIFT[animation] ?? { x: 0, y: 0 };
/** How much of the middle third the resting boat may fill, and of the width. */
const BOAT_MAX_HEIGHT = 0.92;
const BOAT_MAX_WIDTH = 0.85;

/** Screen y of the waterline while the camera is at rest. */
export function waterlineY(view: Size): number {
	return view.height * WATERLINE_Y;
}

/** `0` at the boat .. `1` once the cast has finished, eased both ends so the
 *  camera starts and stops without a jolt. Drives the pan, the hook's fall and
 *  the fade-in of the depth markers. */
export function castProgress(depth: number): number {
	const t = Math.min(1, Math.max(0, depth / CAST_METERS));
	return t * t * (3 - 2 * t);
}

/** `worldScale` (default 1) scales the underwater metres-to-pixels for the sim modes
 *  (docs/SIMULATION.md §5). Pixels the surface world has scrolled up. It has left the screen entirely
 *  by the time the cast finishes, then the water carries on at `PX_PER_METER`. */
export function cameraScroll(depth: number, view: Size, worldScale = 1): number {
	return waterlineY(view) * castProgress(depth) + PX_PER_METER * worldScale * depth;
}

/** World y (camera at rest) of something `meters` below the surface. The
 *  cast's extra half-screen of pan is folded in so the hook, sitting at
 *  `HOOK_REST_Y` on screen, is level with whatever is at its own depth. */
function depthWorldY(meters: number, view: Size, worldScale = 1): number {
	return waterlineY(view) + view.height * HOOK_REST_Y * castProgress(meters) + PX_PER_METER * worldScale * meters;
}

/** Screen y of something at `meters` while the hook is at `depth`. */
export function depthToScreenY(meters: number, depth: number, view: Size, worldScale = 1): number {
	return depthWorldY(meters, view, worldScale) - cameraScroll(depth, view, worldScale);
}

export interface BoatLayout {
	x: number;
	y: number;
	scale: number;
	/** `scale` with the boat at rest: what the hook is sized off, so it doesn't shrink as the boat backs away. */
	restScale: number;
	/** Rod tip in world space (camera at rest) — where the line hangs from. */
	tip: { x: number; y: number };
}

/** Where the boat is while a catch is landed, both 0..1 with 0 the boat at rest: `station` pulls it back and shrinks it
 *  until its rod tip is over the hook at the middle of the screen; `retire` then has it back away to the sidelines. */
export interface BoatStance {
	station: number;
	retire: number;
}

/** The stationed boat is this much of its resting size, or less if it wouldn't fit beside the hook. */
const STATION_SCALE = 0.8;
/** A share of the screen width the stationed boat's whole frame may fill, from its left edge to the hook. */
const STATION_FIT = 0.92;
/** The sidelined boat is this much of its resting size, and this far along the screen from its left edge. */
const SIDELINE_SCALE = 0.5;
const SIDELINE_X = 0.18;
/** How far back each stance sits, as a share of the harbour water — the boat's waterline runs from the seam (0) to
 *  the horizon (1), so further back is higher up the screen. */
const STATION_BACK = 0.2;
const SIDELINE_BACK = 0.55;

const mixed = (from: number, to: number, u: number) => from + (to - from) * u;

/** The boat floating on the waterline, its resting pose filling the middle third — centred on screen at rest, and
 *  through a landing (`BoatStance`) stationed beside the hook and then on the sidelines. `scale` is screen px per
 *  sheet pixel; `bob` is the swell offset in px. */
export function boatLayout(
	view: Size,
	bob: number,
	{ station, retire }: BoatStance = { station: 0, retire: 0 }
): BoatLayout {
	const restScale = Math.min(
		((view.height / 3) * BOAT_MAX_HEIGHT) / REST_HEIGHT,
		(view.width * BOAT_MAX_WIDTH) / PLAYER_FRAME.width
	);
	const centre = view.width / 2;
	const water = waterlineY(view) - horizonY(view);

	// Sheet px from the boat's centre to its rod tip, and from its left edge to its rod tip.
	const tipReach = (ROD_TIP.x - BOAT_ANCHOR.x) * PLAYER_FRAME.width;
	const stationScale = Math.min(
		restScale * STATION_SCALE,
		(centre * STATION_FIT) / (tipReach + PLAYER_FRAME.width * BOAT_ANCHOR.x)
	);

	const scale = mixed(mixed(restScale, stationScale, station), restScale * SIDELINE_SCALE, retire);
	// On the sidelines the whole boat stays on screen.
	const sidelineX = Math.max(view.width * SIDELINE_X, PLAYER_FRAME.width * restScale * SIDELINE_SCALE * BOAT_ANCHOR.x);
	const x = mixed(mixed(centre, centre - tipReach * stationScale, station), sidelineX, retire);
	const back = mixed(mixed(0, STATION_BACK, station), SIDELINE_BACK, retire);
	// A boat further off bobs less.
	const y = waterlineY(view) - back * water + bob * (scale / restScale);
	const left = x - PLAYER_FRAME.width * scale * BOAT_ANCHOR.x;
	const top = y - PLAYER_FRAME.height * scale * BOAT_ANCHOR.y;

	return {
		x,
		y,
		scale,
		restScale,
		tip: {
			x: left + ROD_TIP.x * PLAYER_FRAME.width * scale,
			y: top + ROD_TIP.y * PLAYER_FRAME.height * scale
		}
	};
}

/** World y of the hook: it falls from the rod tip to its resting screen height
 *  while the camera pans, so its screen y is a straight blend of the two. */
export function hookWorldY(depth: number, tipY: number, view: Size, worldScale = 1): number {
	const screenY = tipY + (view.height * HOOK_REST_Y - tipY) * castProgress(depth);
	return screenY + cameraScroll(depth, view, worldScale);
}
