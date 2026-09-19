import { HORIZON_Y } from "./framing";

interface Size {
	width: number;
	height: number;
}

export interface BackgroundFit<T extends Size> {
	/** Which of the two exports to draw. */
	texture: T;
	/** Uniform sprite scale. */
	scale: number;
	/** Viewport centre — the sprite is anchored 0.5. */
	x: number;
	y: number;
}

/** Where the docks' waterline sits in each export, as a fraction of the art's
 *  height — the bottom edge of the pier that spans the middle of the frame.
 *  Measured off the current art; retune if it's re-exported. */
const DOCK_LINE = { desktop: 0.438, mobile: 0.411 };

/**
 * Picks the harbour background export for the current viewport and places it
 * so the docks' waterline sits on the horizon (`HORIZON_Y`, the top third of
 * the screen) — sky, city and docks above it, the harbour water below. Two art
 * exports, each authored for its shape (docs/ASSETS.md — portrait-first, wide
 * desktop also supported):
 *
 * - **landscape** (`w >= h`): the wide `bg-desktop` export.
 * - **portrait** (`w < h`): the 9:16 `bg-mobile` composition.
 *
 * Both are fit to the viewport width. On a wide, short screen the top third
 * can't hold the whole skyline, so the top of the sky (and the tower's tip)
 * crops rather than the docks falling short of the screen edges.
 */
export function computeBackgroundFit<T extends Size>(screen: Size, desktop: T, mobile: T): BackgroundFit<T> {
	const landscape = screen.width >= screen.height;
	const texture = landscape ? desktop : mobile;
	const scale = screen.width / texture.width;
	const dockLine = landscape ? DOCK_LINE.desktop : DOCK_LINE.mobile;
	const top = screen.height * HORIZON_Y - dockLine * texture.height * scale;

	return { texture, scale, x: screen.width / 2, y: top + (texture.height * scale) / 2 };
}

/**
 * Maps a point in the background art's own pixel space (top-left origin,
 * e.g. a landmark measured off the source image) to screen space, given the
 * `BackgroundFit` the sprite is drawn with (anchor `0.5`). For code-driven
 * effects pinned to something baked into the art — the Skytree antenna tip,
 * say — rather than placed independently of it.
 */
export function textureToScreen<T extends Size>(fit: BackgroundFit<T>, point: { x: number; y: number }) {
	return {
		x: fit.x + (point.x - fit.texture.width / 2) * fit.scale,
		y: fit.y + (point.y - fit.texture.height / 2) * fit.scale
	};
}
