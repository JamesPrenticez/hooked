import { viewBreakpoint } from "@utils/breakpoint";

/** A nudge and a resize for one part of the harbour: px offset from where it rests, and a multiple of its size. */
export interface Tweak {
	x: number;
	y: number;
	scale: number;
}

export type LayoutKey = "background" | "water" | "waterline" | "player" | "crane" | "helicopter" | "fish";

const NONE: Tweak = { x: 0, y: 0, scale: 1 };

const unchanged = (): Record<LayoutKey, Tweak> => ({
	background: NONE,
	water: NONE,
	waterline: NONE,
	player: NONE,
	crane: NONE,
	helicopter: NONE,
	fish: NONE
});

/**
 * Where each harbour part rests relative to where its own maths puts it. `x`/`y` are a share of the view (of
 * width / height) rather than px, so an offset still looks right at any screen size; `scale` multiplies the
 * part's size. Edit by hand — the three breakpoints are the layouts this project tests (`viewBreakpoint`).
 */
export const HARBOUR_LAYOUT: Record<ReturnType<typeof viewBreakpoint>, Record<LayoutKey, Tweak>> = {
	desktop: {
		...unchanged(),
		background: { x: 0, y: -0.0762, scale: 0.7267 },
		water: { x: 0, y: -0.3602, scale: 1 },
		waterline: { x: 0, y: 0.0185, scale: 1 },
		player: { x: -0.0729, y: -0.0947, scale: 0.62 },
		crane: { x: -0.0182, y: 0, scale: 1.2 }
	},
	mobileLandscape: unchanged(),
	mobilePortrait: unchanged()
};

/** `HARBOUR_LAYOUT`'s rest offset for `key` at whichever breakpoint `view` falls into, resolved to this view's px. */
export const layout = (key: LayoutKey, view: { width: number; height: number }): Tweak => {
	const base = HARBOUR_LAYOUT[viewBreakpoint(view)][key];
	return { x: base.x * view.width, y: base.y * view.height, scale: base.scale };
};

/** Container props that move and resize a part about `at`, the point it is anchored to. */
export const tweakProps = ({ x, y, scale }: Tweak, at: { x: number; y: number }) => ({
	x: at.x + x,
	y: at.y + y,
	pivot: at,
	scale
});
