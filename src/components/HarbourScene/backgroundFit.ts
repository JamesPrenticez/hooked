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
 *   width. Its transparent top/bottom bleed off-screen; nothing load-bearing
 *   sits there.
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

	return { texture, scale, x: screen.width / 2, y: screen.height / 2 };
}
