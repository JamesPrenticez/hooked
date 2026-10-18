import { create } from "zustand";

import type { StartMessage, Volatility } from "@type/api";

// The stake and volatility being composed before a cast. The stake is integer
// cents so it stays exact — it becomes the wire's decimal string only in
// `toWireStart` (Rule 6b). Client-side only: the server validates the real
// stake and rolls the round (ARCHITECTURE §13).

/** Selectable stake, in cents (server limits: 0.10–500.00). */
export const CHIP_VALUES = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000];

interface BetStore {
	/** Stake for the next cast, in cents. */
	chip: number;
	/** How likely the hook is to dive deep (`@constants/volatility`). */
	volatility: Volatility;
	setChip: (chip: number) => void;
	setVolatility: (volatility: Volatility) => void;
}

export const useBetStore = create<BetStore>(set => ({
	chip: 100,
	volatility: "medium",
	setChip: chip => set({ chip }),
	setVolatility: volatility => set({ volatility })
}));

/** The composed stake and volatility in the shape `api.startRound` takes. */
export function toWireStart({ chip, volatility }: Pick<BetStore, "chip" | "volatility">): StartMessage {
	return { stake: (chip / 100).toFixed(2), volatility };
}
