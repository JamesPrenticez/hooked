import { create } from "zustand";

// Dev-only overrides surfaced by the DEBUG panel (bottom-right, all phases).
// Categories grow here as more get debug controls — environment is the first.
interface DebugStore {
	/** Manual time-of-day (`[0, 1)`), used in place of the live clock while frozen. */
	timeOfDay: number;
	/** Stops `useDayNightClock` from advancing — the range slider drives `timeOfDay` instead. */
	frozen: boolean;
	setTimeOfDay: (t: number) => void;
	setFrozen: (frozen: boolean) => void;
}

export const useDebugStore = create<DebugStore>(set => ({
	timeOfDay: 0.5,
	frozen: false,
	setTimeOfDay: t => set({ timeOfDay: t }),
	setFrozen: frozen => set({ frozen })
}));
