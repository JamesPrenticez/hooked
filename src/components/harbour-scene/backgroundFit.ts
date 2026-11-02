import type { Tweak } from "@constants/harbourLayout";

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

/** The pixel size of the `bg-desktop` / `bg-mobile` exports — the grid `DOCK_LINE` and the landmarks are measured in. */
const FRAME = {
	desktop: { width: 1774, height: 887 },
	mobile: { width: 941, height: 1672 }
};

/** Where the docks' waterline sits in each export, as a fraction of the art's
 *  height — the bottom edge of the pier that spans the middle of the frame.
 *  Measured off the current art; retune if it's re-exported. */
const DOCK_LINE = { desktop: 0.617, mobile: 0.644 };

/**
 * Picks the frame for the current viewport and places it so the docks'
 * waterline sits on the horizon (`HORIZON_Y`, the top third of the screen) —
 * sky, city and docks above it, the harbour water below. Two art shapes
 * (docs/ASSETS.md — portrait-first, desktop also supported):
 *
 * - **landscape** (`w >= h`): the desktop frame.
 * - **portrait** (`w < h`): the 9:16 mobile frame.
 *
 * Both are fit to the viewport width. On a wide, short screen the top third
 * can't hold the whole skyline, so the top of the sky (and the tower's tip)
 * crops rather than the docks falling short of the screen edges.
 */
export function computeBackgroundFit(screen: Size, tweak: Tweak = { x: 0, y: 0, scale: 1 }): BackgroundFit {
	const landscape = screen.width >= screen.height;
	const texture = landscape ? FRAME.desktop : FRAME.mobile;
	const dockLine = landscape ? DOCK_LINE.desktop : DOCK_LINE.mobile;
	const horizon = screen.height * (HORIZON_Y + (landscape ? DESKTOP_DROP : 0));
	// The layer is then resized/nudged about the screen centre (`tweakProps`), which moves the docks to here...
	const tweakedHorizon = screen.height / 2 + tweak.y + tweak.scale * (horizon - screen.height / 2);
	// ...so fit the width, but never so small that the sky above the docks stops short of the screen top.
	const scale = Math.max(screen.width / texture.width, tweakedHorizon / tweak.scale / (dockLine * texture.height));
	const top = horizon - dockLine * texture.height * scale;

	return {
		texture,
		scale,
		x: screen.width / 2,
		y: top + (texture.height * scale) / 2
	};
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
