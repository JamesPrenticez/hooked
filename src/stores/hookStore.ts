import { create } from "zustand";

/** `auto` is today's scripted descent; `manual` (debug only) steers the sim with
 *  the arrow keys; `replay` plays a recording. Only `auto` is wired so far. */
export type HookMode = "auto" | "manual" | "replay";

interface HookStore {
	hookMode: HookMode;
	setHookMode: (mode: HookMode) => void;
}

export const useHookStore = create<HookStore>(set => ({
	hookMode: "auto",
	setHookMode: hookMode => set({ hookMode })
}));
