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

/** P(depth) for the first roll. Shallow common, trench rare. */
export const DEPTH_WEIGHTS: Record<DepthId, number> = {
	shallow: 45,
	reef: 30,
	deep: 17,
	abyss: 7,
	trench: 1
};

/** Payout multiplier for a winning `depth` bet — 0.96 / P(depth), 2dp. Rarer
 *  depth pays more. Mirrors the fish multipliers below. */
export const DEPTH_MULTIPLIERS: Record<DepthId, number> = {
	shallow: 2.13,
	reef: 3.2,
	deep: 5.65,
	abyss: 13.71,
	trench: 96
};

/** Every catchable fish, grouped by depth. A round outcome always names one;
 *  its tier is looked up here, not rolled separately. */
export const FISH: FishDef[] = [
	// Shallow — common, low value
	{ id: "shrimp", depth: "shallow", tier: "small", weight: 30, multiplier: 7.11 },
	{ id: "sardine", depth: "shallow", tier: "small", weight: 25, multiplier: 8.53 },
	{ id: "blue-cod", depth: "shallow", tier: "small", weight: 20, multiplier: 10.67 },
	{ id: "barracuda", depth: "shallow", tier: "small", weight: 15, multiplier: 14.22 },
	{ id: "puffer", depth: "shallow", tier: "small", weight: 10, multiplier: 21.33 },
	// Reef — mid value
	{ id: "napoleon", depth: "reef", tier: "large", weight: 35, multiplier: 9.14 },
	{ id: "turtle", depth: "reef", tier: "large", weight: 30, multiplier: 10.67 },
	{ id: "swordfish", depth: "reef", tier: "large", weight: 20, multiplier: 16 },
	{ id: "king-crab", depth: "reef", tier: "large", weight: 15, multiplier: 21.33 },
	// Deep — rare, high value
	{ id: "manta-ray", depth: "deep", tier: "epic", weight: 35, multiplier: 16.13 },
	{ id: "bluefin-tuna", depth: "deep", tier: "epic", weight: 30, multiplier: 18.82 },
	{ id: "shark", depth: "deep", tier: "epic", weight: 20, multiplier: 28.24 },
	{ id: "barracuda-epic", depth: "deep", tier: "epic", weight: 15, multiplier: 37.65 },
	// Abyss — legendary, plus the whale jackpot
	{ id: "lanternfish", depth: "abyss", tier: "legendary", weight: 40, multiplier: 34.29 },
	{ id: "jellyfish", depth: "abyss", tier: "legendary", weight: 30, multiplier: 45.71 },
	{ id: "starfish", depth: "abyss", tier: "legendary", weight: 22, multiplier: 62.34 },
	{ id: "whale", depth: "abyss", tier: "jackpot", weight: 8, multiplier: 171.43 },
	// Trench — the Kraken, nothing else
	{ id: "kraken", depth: "trench", tier: "jackpot", weight: 100, multiplier: 96 }
];

/** Valid `selection` values for a `fish` bet — every roster id (§13 bet validation). */
export const FISH_IDS: ReadonlySet<string> = new Set(FISH.map(f => f.id));
