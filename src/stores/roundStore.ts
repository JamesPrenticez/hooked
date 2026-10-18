import { create } from "zustand";

import type { FishingOutcome, MarketEntry, PayoutResult, RoundStatus, Volatility } from "@type/api";

// The authoritative round the client is presenting, mirrored from the server
// (ARCHITECTURE §9, §12, §18). Every field arrives verbatim in a server
// response — startRound() / completeRound(), or getRound() when resuming
// (§4.4). Like balanceStore, there is no action that derives any of this
// locally: the client never rolls an outcome (Rule 2), never computes a payout
// or balance (Rules 3/15), and the presentation state machine (§18) is a
// separate thing that reads from here. `metadata.balance` on a round response
// is not the balance (§14) — the post-round figure reaches the client through
// balanceStore (getBalance() after settle), not this store.
export interface RoundSnapshot {
	roundId: string;
	/** The server's word — "open" after start, "completed" after settle. */
	status: RoundStatus;
	/** The stake the round took and the volatility it was cast at, as the server locked them (§9 LOCK BETS). */
	stake: string;
	volatility: Volatility;
	/** What every fish pays this round — rolled with the catch, so it rotates round to round. */
	market: MarketEntry[];
	outcome: FishingOutcome;
	payout: PayoutResult;
}

interface RoundStore {
	/** null between rounds — nothing to present until the server opens one. */
	round: RoundSnapshot | null;
	/** Replace the mirrored round wholesale with the server's latest word. */
	setRound: (round: RoundSnapshot) => void;
	/** Back to no active round — returning to BETTING after PAYOUT (§18). */
	clearRound: () => void;
}

export const useRoundStore = create<RoundStore>(set => ({
	round: null,
	setRound: round => set({ round }),
	clearRound: () => set({ round: null })
}));
