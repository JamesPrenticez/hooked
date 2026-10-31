import { create } from "zustand";

import { DEBUG } from "@constants/config";
import type { Recording } from "@utils/simRecording";
import type { Sim } from "@utils/simStep";

/** `auto` plays out the server's round; `manual` (debug only) ignores it and steers the sim with
 *  the arrow keys; `replay` (debug) plays `replay` back instead of reading the keys. */
export type HookMode = "auto" | "manual" | "replay";

/** What a replay needs to play a run again: its world, its weight and its steering. */
export type ReplayRun = Pick<Recording, "worldSeed" | "multiplier" | "inputs">;

export const TIME_SCALES = [1, 2, 4, 8] as const;

interface HookStore {
	hookMode: HookMode;
	setHookMode: (mode: HookMode) => void;
	worldSeed: number;
	setWorldSeed: (seed: number) => void;
	/** Debug override of how heavy the next manual catch is; auto runs always use the round's own multiplier. It picks the gear
	 *  that lands the fish (rod, crane, helicopter) and how big the fish is once it is out of the water. */
	multiplier: number | undefined;
	setMultiplier: (multiplier: number | undefined) => void;
	/** Sim ticks per real tick — fast-forwards a run without changing it. */
	timeScale: number;
	setTimeScale: (scale: number) => void;
	/** Debug overlay: mouth circles and the hook tip. */
	showHitboxes: boolean;
	setShowHitboxes: (show: boolean) => void;
	/** Arrow keys currently held (manual mode) — drives the debug key pad. */
	heldKeys: string[];
	/** The run `replay` mode plays. Set by the debug Recordings list. */
	replay: ReplayRun | undefined;
	setReplay: (run: ReplayRun | undefined) => void;
	/** Live snapshot of the running sim; unset when none is running. */
	sim: Sim | undefined;
	/** The last run that reached SURFACED — kept after the sim is cleared, so it can be saved. */
	recording: Recording | undefined;
}

export const useHookStore = create<HookStore>(set => ({
	hookMode: "auto",
	setHookMode: hookMode => set({ hookMode }),
	worldSeed: 1,
	setWorldSeed: worldSeed => set({ worldSeed }),
	multiplier: undefined,
	setMultiplier: multiplier => set({ multiplier }),
	timeScale: 1,
	setTimeScale: timeScale => set({ timeScale }),
	showHitboxes: false,
	setShowHitboxes: showHitboxes => set({ showHitboxes }),
	heldKeys: [],
	sim: undefined,
	recording: undefined,
	replay: undefined,
	setReplay: replay => set({ replay })
}));

/** Sim-driven hook control (manual or replay) only exists in debug builds, whatever `hookMode` says. */
export function useSimHook(): boolean {
	return useHookStore(state => DEBUG && state.hookMode !== "auto");
}
