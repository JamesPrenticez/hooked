// Authoritative gambling-math configuration (ARCHITECTURE.md §4, §10, §20).
// Server-only — the odds never cross the wire (§37). What does cross it is each round's market: the
// price list market.ts rolls for that round.
//
// A round pays stake × the price of the fish the hook lands. The player picks a volatility, which sets
// how likely the hook is to dive into each depth zone (LEVELS); a fish in that zone is landed at random;
// and its price comes off the round's market, where every zone's pool of prices (PRICE_POOLS) is shuffled
// across the zone's fish. Nothing here is a final multiplier: market.ts scales each volatility's pools
// until it returns RTP, so retuning an odds or a price can't take a volatility off its target.
//
// ponytail: there is no dud outcome yet. Without one, the only way to hold 96% is cheap shallow fish
// (most pay under 1×). Junk (src/assets/junk) is the next lever: add it as a weight in `odds` paying 0,
// and market.ts scales every price up to compensate.

import type { DepthId, FishTier, Volatility } from "./rounds.ts";

export const DEPTHS: DepthId[] = ["shallow", "reef", "deep", "abyss", "jackpot"];

export interface FishDef {
	id: string;
	depth: DepthId;
	tier: FishTier;
}

/** Every catchable fish, grouped by depth. A round outcome always names one; its tier is looked up here, not rolled. */
export const FISH: FishDef[] = [
	// Shallow — common, low value
	{ id: "shrimp", depth: "shallow", tier: "small" },
	{ id: "sardine", depth: "shallow", tier: "small" },
	{ id: "blue-cod", depth: "shallow", tier: "small" },
	{ id: "barracuda", depth: "shallow", tier: "small" },
	{ id: "guppy", depth: "shallow", tier: "small" },
	{ id: "clown", depth: "shallow", tier: "small" },
	// Reef — mid value
	{ id: "napoleon", depth: "reef", tier: "large" },
	{ id: "turtle", depth: "reef", tier: "large" },
	{ id: "king-crab", depth: "reef", tier: "large" },
	{ id: "snapper", depth: "reef", tier: "large" },
	{ id: "grouper", depth: "reef", tier: "large" },
	{ id: "trevelly", depth: "reef", tier: "large" },
	// Deep — rare, high value
	{ id: "sting-ray", depth: "deep", tier: "epic" },
	{ id: "bluefin-tuna", depth: "deep", tier: "epic" },
	{ id: "shark", depth: "deep", tier: "epic" },
	{ id: "barracuda-epic", depth: "deep", tier: "epic" },
	{ id: "puffer", depth: "deep", tier: "epic" },
	{ id: "swordfish", depth: "deep", tier: "epic" },
	{ id: "sting", depth: "deep", tier: "epic" },
	// Abyss — legendary, plus the whale jackpot
	{ id: "lanternfish", depth: "abyss", tier: "legendary" },
	{ id: "jellyfish", depth: "abyss", tier: "legendary" },
	{ id: "starfish", depth: "abyss", tier: "legendary" },
	{ id: "whale", depth: "abyss", tier: "jackpot" },
	{ id: "squid", depth: "abyss", tier: "legendary" },
	{ id: "dragon", depth: "abyss", tier: "legendary" },
	// Jackpot — the thin layer at the very bottom, the Kraken and nothing else
	{ id: "kraken", depth: "jackpot", tier: "jackpot" }
];

/** Valid ids for a forced fish (debug) — every roster id. */
export const FISH_IDS: ReadonlySet<string> = new Set(FISH.map(f => f.id));

/** The return to player (GDD: 96%) every volatility is scaled to. */
export const RTP = 0.96;

/** What the fish in each zone are worth, one entry per fish. Shuffled across the zone's fish every round, so which
 *  fish is worth the most rotates. Relative: only the ratios between entries and between zones matter — market.ts
 *  scales them. Each pool holds exactly as many entries as its zone has fish. */
export const PRICE_POOLS: Record<Exclude<DepthId, "jackpot">, number[]> = {
	shallow: [1, 1.2, 1.5, 1.8, 2.2, 2.6],
	reef: [3, 3.5, 4, 4.8, 5.6, 6.8],
	deep: [8, 10, 12, 15, 18, 22, 28],
	abyss: [18, 24, 32, 44, 60, 90]
};

export interface Level {
	/** Relative chance the hook dives into each zone — the volatility. Integers, since they are drawn as weights. */
	odds: Record<DepthId, number>;
	/** What the Kraken pays. Fixed rather than scaled, so the top prize rises with the volatility. */
	jackpot: number;
}

/** Calmer water keeps the hook shallow; rougher water sends it deeper, and the jackpot grows with it. */
export const LEVELS: Record<Volatility, Level> = {
	low: { odds: { shallow: 5600, reef: 3300, deep: 900, abyss: 190, jackpot: 10 }, jackpot: 50 },
	medium: { odds: { shallow: 4300, reef: 3200, deep: 1750, abyss: 740, jackpot: 10 }, jackpot: 100 },
	high: { odds: { shallow: 3300, reef: 3000, deep: 2500, abyss: 1190, jackpot: 10 }, jackpot: 200 }
};

export const VOLATILITIES = Object.keys(LEVELS) as Volatility[];
