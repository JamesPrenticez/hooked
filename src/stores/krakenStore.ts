import { create } from "zustand";

import { FIRST_KRAKEN_ANIMATION } from "@constants/krakenAnimations";

// Debug-only for now: no jackpot outcome drives the boss encounter yet, so the
// DEBUG panel's "Kraken" category forces it and cues the sheets' animations.
interface KrakenStore {
	/** Parks the hook at the bottom of the trench (`App` overrides the depth),
	 *  which is where the Kraken shows up. */
	forceTrench: boolean;
	setForceTrench: (force: boolean) => void;
	/** The animation to show. `id` changes on every `play`, so picking the one
	 *  that's already running starts it again from the top. */
	cue: { animation: string; id: number };
	play: (animation: string) => void;
}

export const useKrakenStore = create<KrakenStore>(set => ({
	forceTrench: false,
	setForceTrench: forceTrench => set({ forceTrench }),
	cue: { animation: FIRST_KRAKEN_ANIMATION, id: 0 },
	play: animation => set(state => ({ cue: { animation, id: state.cue.id + 1 } }))
}));
