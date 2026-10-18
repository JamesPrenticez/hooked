import { FISH } from "@constants/fish";
import type { RoundSnapshot } from "@stores/roundStore";
import type { MarketEntry } from "@type/api";

/** A fish market for tests: the sardine is worth 0.25×, every other fish 1×. */
export const MARKET: MarketEntry[] = FISH.map(f => ({ fish: f.id, multiplier: f.id === "sardine" ? "0.25" : "1.00" }));

/** A round the server opened for a $1.00 stake on medium volatility: it landed the sardine, which pays 0.25×. */
export function roundSnapshot(overrides: Partial<RoundSnapshot> = {}): RoundSnapshot {
	return {
		roundId: "r1",
		status: "open",
		stake: "1.00",
		volatility: "medium",
		market: MARKET,
		outcome: { depth: "shallow", fish: "sardine", tier: "small", multiplier: "0.25" },
		payout: { total: "0.25", wagered: "1.00", net: "-0.75" },
		...overrides
	};
}
