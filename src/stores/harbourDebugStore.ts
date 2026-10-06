import { create } from "zustand";
import { persist } from "zustand/middleware";

import { DEBUG } from "@constants/config";
import { type ViewBreakpoint, viewBreakpoint } from "@utils/breakpoint";

/** A nudge and a resize for one part of the harbour: px offset from where it rests, and a multiple of its size. */
export interface Tweak {
	x: number;
	y: number;
	scale: number;
}

export const TWEAK_KEYS = ["background", "water", "waterline", "player", "crane", "helicopter", "fish"] as const;
export type TweakKey = (typeof TWEAK_KEYS)[number];

export const NO_TWEAK: Tweak = { x: 0, y: 0, scale: 1 };

const getDefaults = () => Object.fromEntries(TWEAK_KEYS.map(key => [key, { ...NO_TWEAK }])) as Record<TweakKey, Tweak>;

/**
 * Where each harbour part rests, baked in from a HARBOUR panel session — the single source of truth the live
 * debug tweak above is a temporary nudge on top of. Same `{x, y, scale}` shape as a `Tweak`, but `x`/`y` are a
 * share of the view (of width / height) rather than screen px, so a baked offset still looks right at any
 * screen size — a flat px nudge only looks right at the size you dragged it at.
 *
 * Desktop, mobile landscape and mobile portrait each get their own values (`viewBreakpoint`) — the three
 * layouts this project actually tests — since a part's rest position doesn't scale cleanly between them.
 *
 * To update: resize to the breakpoint you want, dial it in with the HARBOUR panel, hit "Copy layout", and
 * paste the result over this object. The button does the px-to-share conversion for you, so what you paste
 * is already in this object's own units — and already has the other two breakpoints' values folded in.
 */

// export const HARBOUR_LAYOUT: Record<ViewBreakpoint, Record<TweakKey, Tweak>> = {
// 	desktop: getDefaults(),
// 	mobileLandscape: getDefaults(),
// 	mobilePortrait: getDefaults()
// };

export const HARBOUR_LAYOUT: Record<ViewBreakpoint, Record<TweakKey, Tweak>> = {
	desktop: {
		background: { x: 0, y: -0.0958, scale: 0.6867 },
		water: { x: 0, y: -0.5125, scale: 1 },
		waterline: { x: 0, y: -0.0947, scale: 1 },
		player: { x: -0.0729, y: -0.0947, scale: 0.62 },
		crane: { x: -0.0182, y: 0, scale: 1.2 },
		helicopter: { x: 0, y: 0, scale: 1 },
		fish: { x: 0, y: 0, scale: 1 }
	},
	mobileLandscape: {
		background: { x: 0, y: 0, scale: 1 },
		water: { x: 0, y: 0, scale: 1 },
		waterline: { x: 0, y: 0, scale: 1 },
		player: { x: 0, y: 0, scale: 1 },
		crane: { x: 0, y: 0, scale: 1 },
		helicopter: { x: 0, y: 0, scale: 1 },
		fish: { x: 0, y: 0, scale: 1 }
	},
	mobilePortrait: {
		background: { x: 0, y: 0, scale: 1 },
		water: { x: 0, y: 0, scale: 1 },
		waterline: { x: 0, y: 0, scale: 1 },
		player: { x: 0, y: 0, scale: 1 },
		crane: { x: 0, y: 0, scale: 1 },
		helicopter: { x: 0, y: 0, scale: 1 },
		fish: { x: 0, y: 0, scale: 1 }
	}
};

interface HarbourDebugStore {
	tweaks: Record<TweakKey, Tweak>;
	setTweak: (key: TweakKey, patch: Partial<Tweak>) => void;
	reset: () => void;
}

export const useHarbourDebugStore = create<HarbourDebugStore>()(
	persist(
		set => ({
			tweaks: getDefaults(),
			setTweak: (key, patch) =>
				set(state => ({
					tweaks: {
						...state.tweaks,
						[key]: { ...state.tweaks[key], ...patch }
					}
				})),
			reset: () => set({ tweaks: getDefaults() })
		}),
		{
			name: "deepcatch.harbour-debug",
			version: 1,
			// Values saved before a part was added lack its key; fill it in rather than crash.
			merge: (saved, current) => ({
				...current,
				tweaks: {
					...current.tweaks,
					...(saved as Partial<typeof current> | undefined)?.tweaks
				}
			})
		}
	)
);

/** The debug nudge for one part of the harbour — never applied outside debug builds, whatever was saved. */
export const useTweak = (key: TweakKey): Tweak => useHarbourDebugStore(state => (DEBUG ? state.tweaks[key] : NO_TWEAK));

/** `HARBOUR_LAYOUT`'s baked rest offset for `key`, at whichever breakpoint `view` falls into, resolved to this
 *  view's px and combined with a live debug `tweak` — so a panel nudge is always relative to the baked-in
 *  rest position, not instead of it. */
export const layoutTweak = (key: TweakKey, view: { width: number; height: number }, tweak: Tweak): Tweak => {
	const base = HARBOUR_LAYOUT[viewBreakpoint(view)][key];
	return {
		x: base.x * view.width + tweak.x,
		y: base.y * view.height + tweak.y,
		scale: base.scale * tweak.scale
	};
};

/** `layoutTweak`, pulling its live debug tweak from the store itself — for call sites where `view` is already
 *  known at the point the debug hook would fire. (Where it isn't — e.g. behind an async-init guard — call
 *  `useTweak` early as usual and combine with `layoutTweak` once `view` is ready.) */
export const useLayout = (key: TweakKey, view: { width: number; height: number }): Tweak =>
	layoutTweak(key, view, useTweak(key));

/** Container props that move and resize a part about `at`, the point it is anchored to. */
export const tweakProps = ({ x, y, scale }: Tweak, at: { x: number; y: number }) => ({
	x: at.x + x,
	y: at.y + y,
	pivot: at,
	scale
});
