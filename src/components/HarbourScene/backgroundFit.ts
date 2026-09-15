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

/**
 * Picks the harbour background export for the current viewport and places it.
 * Two art exports, each authored for its shape (docs/ASSETS.md — portrait-first,
 * wide desktop also supported):
 *
 * - **landscape** (`w >= h`): the wide `bg-desktop` strip, fit to viewport
 *   width and anchored to the bottom of the screen — the foreground dock is
 *   painted at the bottom of the art and must always sit flush with the
 *   bottom of the viewport, whatever the art's transparent top bleed does.
 * - **portrait** (`w < h`): the 9:16 `bg-mobile` composition, scaled to *cover*
 *   the viewport. On a phone taller than 9:16 the outer few percent crop — the
 *   skyline and market stay centred, only generic edge detail is lost.
 */
export function computeBackgroundFit<T extends Size>(screen: Size, desktop: T, mobile: T): BackgroundFit<T> {
	const landscape = screen.width >= screen.height;
	const texture = landscape ? desktop : mobile;
	const scale = landscape
		? screen.width / texture.width
		: Math.max(screen.width / texture.width, screen.height / texture.height);
	const y = landscape ? screen.height - (texture.height * scale) / 2 : screen.height / 2;

	return { texture, scale, x: screen.width / 2, y };
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
