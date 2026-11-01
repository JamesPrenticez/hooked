// Authoritative gambling-math configuration (ARCHITECTURE.md §4, §10, §20).
// Server-only — the odds never cross the wire (§37). What does cross it is each round's market: the
// price list market.ts rolls for that round.
//
// A round pays stake × the price of the fish the hook lands. The player picks a volatility, which sets
// how likely the hook is to dive into each depth zone (LEVELS); a fish in that zone is landed at random;
// and its price comes off the round's market, where each zone's price range (Level.prices) is spread across the
// zone's fish. Every landed fish pays more than the stake, so the RTP is balanced by the other side: a hooked fish
// can get away and pay 0. market.ts derives that chance (`ESCAPE`) so the volatility returns RTP once the bonus and
// the Kraken have taken their share, so retuning an odds or a price can't take a volatility off its target.

import type { DepthId, FishTier, Volatility } from "./rounds.ts";

export type PricedDepth = Exclude<DepthId, "jackpot">;

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

/** Every round highlights 1 to this many fish, each carrying a bonus multiplier from `BONUS_MULTIPLIERS`. */
export const BONUS_MAX_FISH = 5;

/** One round in this many lands one of its highlighted fish, which then pays its bonus on top of its price.
 *  The rest highlight fish that are not the catch. The bonus is part of the RTP: market.ts scales the base
 *  zones' prices down by what it adds. */
export const BONUS_ODDS = 20;

/** What a highlighted fish's bonus can be. Integers, since the bonus multiplies a price held in whole cents. */
export const BONUS_MULTIPLIERS: { value: number; weight: number }[] = [
	{ value: 2, weight: 50 },
	{ value: 3, weight: 30 },
	{ value: 5, weight: 15 },
	{ value: 10, weight: 5 }
];

export interface Level {
	/** Relative chance the hook dives into each zone — the volatility. Integers, since they are drawn as weights. */
	odds: Record<DepthId, number>;
	/** What the Kraken pays. Fixed rather than scaled, so the top prize rises with the volatility. */
	jackpot: number;
	/** The range each zone's fish are priced across (× stake), lowest to highest, spread evenly over the zone's
	 *  roster. Always above 1: a landed fish never pays less than the bet. `deep` and `abyss` are what pushes a round
	 *  into the crane and the helicopter. market.ts derives the escape chance that brings the volatility to RTP. */
	prices: Record<PricedDepth, [low: number, high: number]>;
}

/** Tuned with `pnpm solve:payouts`, which prints the RTP and how many rounds each piece of extraction gear lands.
 *  Every volatility aims for about 1 round in 5 reaching the crane or better; they differ in how far the deep and
 *  abyss prices stretch and in the jackpot. */
export const LEVELS: Record<Volatility, Level> = {
	low: {
		odds: { shallow: 3800, reef: 3200, deep: 2100, abyss: 890, jackpot: 10 },
		jackpot: 30,
		prices: { shallow: [1.05, 1.4], reef: [1.5, 2.2], deep: [1.5, 2.4], abyss: [2.5, 5] }
	},
	medium: {
		odds: { shallow: 4000, reef: 3300, deep: 1950, abyss: 740, jackpot: 10 },
		jackpot: 50,
		prices: { shallow: [1.05, 1.4], reef: [1.5, 2.2], deep: [1.5, 2.5], abyss: [3, 7] }
	},
	high: {
		odds: { shallow: 4100, reef: 3400, deep: 1900, abyss: 590, jackpot: 10 },
		jackpot: 75,
		prices: { shallow: [1.05, 1.4], reef: [1.5, 2.2], deep: [1.5, 2.6], abyss: [3, 9] }
	},
	extreme: {
		odds: { shallow: 4300, reef: 3500, deep: 1750, abyss: 440, jackpot: 10 },
		jackpot: 100,
		prices: { shallow: [1.05, 1.4], reef: [1.5, 2.2], deep: [1.5, 2.8], abyss: [3.5, 12] }
	}
};

export const VOLATILITIES = Object.keys(LEVELS) as Volatility[];
