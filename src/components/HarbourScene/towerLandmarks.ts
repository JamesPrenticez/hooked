export interface TowerLandmark {
	/** Texture-space (pixel, top-left origin) x of the antenna tip. */
	x: number;
	/** Texture-space y of the antenna tip. */
	tipY: number;
}

// Measured directly off bg-lights-mobile.png (942x1669), which shares
// bg-mobile.webp's pixel grid: the tip is the highest lit pixel in the
// overlay.
export const TOWER_LANDMARK_MOBILE: TowerLandmark = { x: 289, tipY: 355 };

// Measured directly off bg-lights-desktop.webp (2149x732), which shares
// bg-desktop.webp's pixel grid — same tip convention as mobile.
export const TOWER_LANDMARK_DESKTOP: TowerLandmark = { x: 684, tipY: 46 };
