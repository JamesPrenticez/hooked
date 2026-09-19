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

/** Screen height fraction the hook rests at once the descent is under way. */
const HOOK_REST_Y = 0.5;

/** Metres over which the cast plays out: the hook falls from the rod tip to
 *  its resting height, and the camera pans from the harbour down into the
 *  water. At the default shallow speed (220 m/s) that's about a second and a
 *  half. */
export const CAST_METERS = 300;

/** Rod tip on `player.png`, as a fraction of the texture. */
const ROD_TIP = { x: 0.915, y: 0.068 };
/** The point on `player.png` that sits on the waterline: bottom-centre, a touch
 *  up so the hull's underside dips into the water. */
export const BOAT_ANCHOR = { x: 0.5, y: 0.96 };
/** How much of the middle third the boat may fill, and of the width. */
const BOAT_MAX_HEIGHT = 0.92;
const BOAT_MAX_WIDTH = 0.8;

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

/** Pixels the surface world has scrolled up. It has left the screen entirely
 *  by the time the cast finishes, then the water carries on at `PX_PER_METER`. */
export function cameraScroll(depth: number, view: Size): number {
	return waterlineY(view) * castProgress(depth) + PX_PER_METER * depth;
}

/** World y (camera at rest) of something `meters` below the surface. The
 *  cast's extra half-screen of pan is folded in so the hook, sitting at
 *  `HOOK_REST_Y` on screen, is level with whatever is at its own depth. */
function depthWorldY(meters: number, view: Size): number {
	return waterlineY(view) + view.height * HOOK_REST_Y * castProgress(meters) + PX_PER_METER * meters;
}

/** Screen y of something at `meters` while the hook is at `depth`. */
export function depthToScreenY(meters: number, depth: number, view: Size): number {
	return depthWorldY(meters, view) - cameraScroll(depth, view);
}

export interface BoatLayout {
	x: number;
	y: number;
	scale: number;
	/** Rod tip in world space (camera at rest) — where the line hangs from. */
	tip: { x: number; y: number };
}

/** The boat, centred on screen and floating on the waterline, filling the
 *  middle third. `bob` is the swell offset in px. */
export function boatLayout(view: Size, texture: Size, bob: number): BoatLayout {
	const scale = Math.min(
		((view.height / 3) * BOAT_MAX_HEIGHT) / texture.height,
		(view.width * BOAT_MAX_WIDTH) / texture.width
	);
	const x = view.width / 2;
	const y = waterlineY(view) + bob;
	const left = x - texture.width * scale * BOAT_ANCHOR.x;
	const top = y - texture.height * scale * BOAT_ANCHOR.y;

	return {
		x,
		y,
		scale,
		tip: { x: left + ROD_TIP.x * texture.width * scale, y: top + ROD_TIP.y * texture.height * scale }
	};
}

/** World y of the hook: it falls from the rod tip to its resting screen height
 *  while the camera pans, so its screen y is a straight blend of the two. */
export function hookWorldY(depth: number, tipY: number, view: Size): number {
	const screenY = tipY + (view.height * HOOK_REST_Y - tipY) * castProgress(depth);
	return screenY + cameraScroll(depth, view);
}
