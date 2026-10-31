import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AudioStore {
	muted: boolean;
	toggleMuted: () => void;
	/** Master volume, 0..1 — scales every sound. */
	masterVolume: number;
	setMasterVolume: (volume: number) => void;
}

/** The player's mute and volume choice, kept across sessions. `AudioSync` applies it to the sound util. */
export const useAudioStore = create<AudioStore>()(
	persist(
		set => ({
			muted: false,
			toggleMuted: () => set(s => ({ muted: !s.muted })),
			masterVolume: 1,
			setMasterVolume: masterVolume => set({ masterVolume })
		}),
		{ name: "hooked-audio" }
	)
);
