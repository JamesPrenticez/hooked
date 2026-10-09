// Authoritative gambling-math configuration (ARCHITECTURE.md §4, §10, §20).
// Server-only — the probability tables never cross the wire (§37). The payout
// multiplier table (DEPTH_MULTIPLIERS + FishDef.multiplier) is the one part the
// client may mirror for its paytable UI (§37) — never the weights.
//
// The fish roster is docs/GDD.md FISH_GUIDE. The GDD tags each fish with one of
// eight fine-grained tierIds; the wire contract (src/types/api.ts) carries five.
// They fold — junk→small, medium→large, rare→epic (small/large/epic/legendary/
// jackpot pass straight through) — so `tier` here is already the wire value.
// `image` / `wide` from the GDD are client presentation and are not mirrored.

import type { DepthId, FishTier } from "./rounds.ts";

export interface FishDef {
	id: string;
	depth: DepthId;
	tier: FishTier;
	/** Relative draw weight *within its depth*. First-pass — see the note below. */
	weight: number;
	/** Payout multiplier for a winning `fish` bet on this id. First-pass — see the note. */
	multiplier: number;
}

// Structure — weighted depth, then a weighted fish within that depth, each
// selection paying a fixed table multiplier — is final. Weights are relative,
// not percentages; the roller sums and normalises them. A weight of 0 disables
// a branch without deleting it.
//
// Multipliers are tuned (BUILD_PLAN 3.5): each is 0.96 / P(selection) rounded
// to 2dp, so every single selection returns ~96% (the GDD RTP target) on its
// own, and any mix of bets does too — bets resolve independently against the
// one outcome, so the blended RTP is just the stake-weighted average. Change a
// weight and its selection's multiplier must be re-derived (server/src/math.test.ts
// asserts the 96% band). Weights alone set hit-frequency / volatility, not RTP.

/** P(depth) for the first roll. Shallow common, jackpot rare. */
export const DEPTH_WEIGHTS: Record<DepthId, number> = {
	shallow: 45,
	reef: 30,
	deep: 17,
	abyss: 7,
	jackpot: 1
};

/** Payout multiplier for a winning `depth` bet — 0.96 / P(depth), 2dp. Rarer
 *  depth pays more. Mirrors the fish multipliers below. */
export const DEPTH_MULTIPLIERS: Record<DepthId, number> = {
	shallow: 2.13,
	reef: 3.2,
	deep: 5.65,
	abyss: 13.71,
	jackpot: 96
};

/** Every catchable fish, grouped by depth. A round outcome always names one;
 *  its tier is looked up here, not rolled separately. */
export const FISH: FishDef[] = [
	// Shallow — common, low value
	{ id: "shrimp", depth: "shallow", tier: "small", weight: 30, multiplier: 9.96 },
	{ id: "sardine", depth: "shallow", tier: "small", weight: 25, multiplier: 11.95 },
	{ id: "blue-cod", depth: "shallow", tier: "small", weight: 20, multiplier: 14.93 },
	{ id: "barracuda", depth: "shallow", tier: "small", weight: 15, multiplier: 19.91 },
	{ id: "guppy", depth: "shallow", tier: "small", weight: 28, multiplier: 10.67 },
	{ id: "clown", depth: "shallow", tier: "small", weight: 22, multiplier: 13.58 },
	// Reef — mid value
	{ id: "napoleon", depth: "reef", tier: "large", weight: 35, multiplier: 14.63 },
	{ id: "turtle", depth: "reef", tier: "large", weight: 30, multiplier: 17.07 },
	{ id: "swordfish", depth: "reef", tier: "large", weight: 20, multiplier: 25.6 },
	{ id: "king-crab", depth: "reef", tier: "large", weight: 15, multiplier: 34.13 },
	{ id: "snapper", depth: "reef", tier: "large", weight: 25, multiplier: 20.48 },
	{ id: "grouper", depth: "reef", tier: "large", weight: 20, multiplier: 25.6 },
	{ id: "trevelly", depth: "reef", tier: "large", weight: 15, multiplier: 34.13 },
	// Deep — rare, high value
	{ id: "manta-ray", depth: "deep", tier: "epic", weight: 35, multiplier: 20.97 },
	{ id: "bluefin-tuna", depth: "deep", tier: "epic", weight: 30, multiplier: 24.47 },
	{ id: "shark", depth: "deep", tier: "epic", weight: 20, multiplier: 36.71 },
	{ id: "barracuda-epic", depth: "deep", tier: "epic", weight: 15, multiplier: 48.94 },
	{ id: "puffer", depth: "deep", tier: "epic", weight: 10, multiplier: 73.41 },
	{ id: "marlin", depth: "deep", tier: "epic", weight: 12, multiplier: 61.18 },
	{ id: "sting", depth: "deep", tier: "epic", weight: 8, multiplier: 91.76 },
	// Abyss — legendary, plus the whale jackpot
	{ id: "lanternfish", depth: "abyss", tier: "legendary", weight: 40, multiplier: 46.29 },
	{ id: "jellyfish", depth: "abyss", tier: "legendary", weight: 30, multiplier: 61.71 },
	{ id: "starfish", depth: "abyss", tier: "legendary", weight: 22, multiplier: 84.16 },
	{ id: "whale", depth: "abyss", tier: "jackpot", weight: 8, multiplier: 231.43 },
	{ id: "squid", depth: "abyss", tier: "legendary", weight: 25, multiplier: 74.06 },
	{ id: "dragon", depth: "abyss", tier: "legendary", weight: 10, multiplier: 185.14 },
	// Jackpot — the thin layer at the very bottom, the Kraken and nothing else
	{ id: "kraken", depth: "jackpot", tier: "jackpot", weight: 100, multiplier: 96 }
];

/** Valid `selection` values for a `fish` bet — every roster id (§13 bet validation). */
export const FISH_IDS: ReadonlySet<string> = new Set(FISH.map(f => f.id));
