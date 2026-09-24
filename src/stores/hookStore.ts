import { create } from "zustand";

import { DEBUG } from "@constants/config";
import type { Sim } from "@utils/simStep";

/** `auto` is today's scripted descent; `manual` (debug only) steers the sim with
 *  the arrow keys; `replay` plays a recording. Only `auto` and `manual` are wired so far. */
export type HookMode = "auto" | "manual" | "replay";

export const TIME_SCALES = [1, 2, 4, 8] as const;

interface HookStore {
	hookMode: HookMode;
	setHookMode: (mode: HookMode) => void;
	worldSeed: number;
	setWorldSeed: (seed: number) => void;
	/** Sim ticks per real tick — fast-forwards a run without changing it. */
	timeScale: number;
	setTimeScale: (scale: number) => void;
	/** Live snapshot of the running sim; unset when none is running. */
	sim: Sim | undefined;
}

export const useHookStore = create<HookStore>(set => ({
	hookMode: "auto",
	setHookMode: hookMode => set({ hookMode }),
	worldSeed: 1,
	setWorldSeed: worldSeed => set({ worldSeed }),
	timeScale: 1,
	setTimeScale: timeScale => set({ timeScale }),
	sim: undefined
}));

/** Manual control only exists in debug builds, whatever `hookMode` says. */
export function useManualHook(): boolean {
	return useHookStore(state => DEBUG && state.hookMode === "manual");
}
