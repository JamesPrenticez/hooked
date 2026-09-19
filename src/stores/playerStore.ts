import { create } from "zustand";

import type { PlayerAnimationName } from "@constants/playerAnimations";

// What the fisherman is playing. Nothing in the game drives this yet — the
// DEBUG panel's "Player" category is its only caller — but it's the one place
// game code will call `play("cast")` from once casting animates him.
interface PlayerStore {
	/** The animation to show. `id` changes on every `play`, so picking the one
	 *  that's already running starts it again from the top. */
	cue: { animation: PlayerAnimationName; id: number };
	play: (animation: PlayerAnimationName) => void;
}

export const usePlayerStore = create<PlayerStore>(set => ({
	cue: { animation: "idle", id: 0 },
	play: animation => set(state => ({ cue: { animation, id: state.cue.id + 1 } }))
}));
