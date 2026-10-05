import { create } from "zustand";

import type { Bet } from "@type/api";

// The bets being composed on the board, before they're submitted. Stakes are
// integer cents so totals stay exact — they become the wire's decimal strings
// only in `toWireBets` (Rule 6b). Client-side only: the server validates and
// locks the real bets (ARCHITECTURE §13).

/** Selectable stake per bet, in cents (server limits: 0.10–500.00). */
export const CHIP_VALUES = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000];

export type BetType = Bet["type"];

export const betKey = (type: BetType, selection: string) => `${type}:${selection}`;

interface BetStore {
	/** Stake applied to the next selection, in cents. */
	chip: number;
	/** `betKey` → stake in cents. A selection is bet on iff it has a key. */
	bets: Record<string, number>;
	setChip: (chip: number) => void;
	/** Bets the selection at the current chip, or removes it if already bet. */
	toggle: (type: BetType, selection: string) => void;
	clear: () => void;
}

export const useBetStore = create<BetStore>((set, get) => ({
	chip: 100,
	bets: {},
	setChip: chip => set({ chip }),
	toggle: (type, selection) => {
		const { bets, chip } = get();
		const key = betKey(type, selection);
		if (key in bets)
			set({
				bets: Object.fromEntries(Object.entries(bets).filter(([k]) => k !== key))
			});
		else set({ bets: { ...bets, [key]: chip } });
	},
	clear: () => set({ bets: {} })
}));

export const selectTotalCents = (s: BetStore) => Object.values(s.bets).reduce((sum, cents) => sum + cents, 0);

/** The composed bets in the shape `api.startRound` takes. */
export function toWireBets(bets: Record<string, number>): Bet[] {
	return Object.entries(bets).map(([key, cents]) => {
		const [type, selection] = key.split(":") as [BetType, string];
		return { type, selection, amount: (cents / 100).toFixed(2) };
	});
}
