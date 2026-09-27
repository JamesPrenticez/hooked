import { create } from "zustand";
import { persist } from "zustand/middleware";

import { DEBUG } from "@constants/config";

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
				set(state => ({ tweaks: { ...state.tweaks, [key]: { ...state.tweaks[key], ...patch } } })),
			reset: () => set({ tweaks: getDefaults() })
		}),
		{
			name: "deepcatch.harbour-debug",
			version: 1,
			// Values saved before a part was added lack its key; fill it in rather than crash.
			merge: (saved, current) => ({
				...current,
				tweaks: { ...current.tweaks, ...(saved as Partial<typeof current> | undefined)?.tweaks }
			})
		}
	)
);

/** The debug nudge for one part of the harbour — never applied outside debug builds, whatever was saved. */
export const useTweak = (key: TweakKey): Tweak => useHarbourDebugStore(state => (DEBUG ? state.tweaks[key] : NO_TWEAK));

/** Container props that move and resize a part about `at`, the point it is anchored to. */
export const tweakProps = ({ x, y, scale }: Tweak, at: { x: number; y: number }) => ({
	x: at.x + x,
	y: at.y + y,
	pivot: at,
	scale
});
