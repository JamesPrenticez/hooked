import { DESKTOP_DROP, HORIZON_Y } from "./framing";

interface Size {
	width: number;
	height: number;
}

export interface BackgroundFit {
	/** The frame the fit is measured in — the size of the retired standard export the wide art is matched to. */
	texture: Size;
	/** Uniform sprite scale. */
	scale: number;
	/** Viewport centre — the sprite is anchored 0.5. */
	x: number;
	y: number;
}

/** The pixel grid the landmarks, `DOCK_LINE` and `WIDE_FIT` are measured in — the size of the retired
 *  `bg-desktop` / `bg-mobile` exports, kept as a coordinate frame now that only the wide art is drawn. */
const FRAME = { desktop: { width: 2560, height: 1441 }, mobile: { width: 941, height: 1670 } };

/** Where the docks' waterline sits in each export, as a fraction of the art's
 *  height — the bottom edge of the pier that spans the middle of the frame.
 *  Measured off the current art; retune if it's re-exported. */
const DOCK_LINE = { desktop: 0.438, mobile: 0.411 };

/**
 * Picks the frame for the current viewport and places it so the docks'
 * waterline sits on the horizon (`HORIZON_Y`, the top third of the screen) —
 * sky, city and docks above it, the harbour water below. Two art shapes
 * (docs/ASSETS.md — portrait-first, wide desktop also supported):
 *
 * - **landscape** (`w >= h`): the desktop frame.
 * - **portrait** (`w < h`): the 9:16 mobile frame.
 *
 * Both are fit to the viewport width. On a wide, short screen the top third
 * can't hold the whole skyline, so the top of the sky (and the tower's tip)
 * crops rather than the docks falling short of the screen edges.
 */
export function computeBackgroundFit(screen: Size): BackgroundFit {
	const landscape = screen.width >= screen.height;
	const texture = landscape ? FRAME.desktop : FRAME.mobile;
	const scale = screen.width / texture.width;
	const dockLine = landscape ? DOCK_LINE.desktop : DOCK_LINE.mobile;
	const drop = landscape ? screen.height * DESKTOP_DROP : 0;
	const top = screen.height * HORIZON_Y + drop - dockLine * texture.height * scale;

	return { texture, scale, x: screen.width / 2, y: top + (texture.height * scale) / 2 };
}

/**
 * Maps a point in the background frame's pixel space (top-left origin,
 * e.g. a landmark measured off the source image) to screen space, given the
 * `BackgroundFit` the sprite is drawn with (anchor `0.5`). For code-driven
 * effects pinned to something baked into the art — the Skytree antenna tip,
 * say — rather than placed independently of it.
 */
export function textureToScreen(fit: BackgroundFit, point: { x: number; y: number }) {
	return {
		x: fit.x + (point.x - fit.texture.width / 2) * fit.scale,
		y: fit.y + (point.y - fit.texture.height / 2) * fit.scale
	};
}

/** Where each wide export sits in the frame: a wide pixel (u, v) is the frame pixel (ax·u + bx, ay·v + by).
 *  Measured by matching against the old standard exports; retune if the wide art is re-exported. The wide art
 *  runs on past the frame's edges for when the camera pulls out (`ZOOM_OUT`). */
const WIDE_FIT = {
	desktop: { ax: 1.96, bx: -751.3, ay: 2.07, by: -251.4 },
	mobile: { ax: 1.91, bx: -1149, ay: 1.91, by: -172.8 }
};

/** Where to draw the wide export (top-left anchored) so it lines up with the frame placed by `fit`. */
export function computeWideFit(fit: BackgroundFit, landscape: boolean) {
	const { ax, bx, ay, by } = WIDE_FIT[landscape ? "desktop" : "mobile"];
	const { texture, scale } = fit;
	return {
		x: fit.x + (bx - texture.width / 2) * scale,
		y: fit.y + (by - texture.height / 2) * scale,
		scale: { x: ax * scale, y: ay * scale }
	};
}
