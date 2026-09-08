// Authoritative gambling-math configuration (ARCHITECTURE.md §4, §10, §20).
// Server-only — the probability tables never cross the wire (§37). The payout
// multiplier table joins this file in milestone 3.3; 3.1 is outcome generation.
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
}

// ponytail: first-pass probability weights. The structure — weighted depth, then
// a weighted fish within that depth — is final; these integers are not.
// Milestone 3.5 runs the RTP simulation and tunes them, with the 3.3 payout
// table, to the GDD's 96% target. Values are relative, not percentages; the
// roller sums and normalises them. A weight of 0 disables a branch without
// deleting it.

/** P(depth) for the first roll. Shallow common, trench rare. */
export const DEPTH_WEIGHTS: Record<DepthId, number> = {
	shallow: 45,
	reef: 30,
	deep: 17,
	abyss: 7,
	trench: 1
};

/** Every catchable fish, grouped by depth. A round outcome always names one;
 *  its tier is looked up here, not rolled separately. */
export const FISH: FishDef[] = [
	// Shallow — common, low value
	{ id: "shrimp", depth: "shallow", tier: "small", weight: 30 },
	{ id: "sardine", depth: "shallow", tier: "small", weight: 25 },
	{ id: "blue-cod", depth: "shallow", tier: "small", weight: 20 },
	{ id: "barracuda", depth: "shallow", tier: "small", weight: 15 },
	{ id: "puffer", depth: "shallow", tier: "small", weight: 10 },
	// Reef — mid value
	{ id: "napoleon", depth: "reef", tier: "large", weight: 35 },
	{ id: "turtle", depth: "reef", tier: "large", weight: 30 },
	{ id: "swordfish", depth: "reef", tier: "large", weight: 20 },
	{ id: "king-crab", depth: "reef", tier: "large", weight: 15 },
	// Deep — rare, high value
	{ id: "manta-ray", depth: "deep", tier: "epic", weight: 35 },
	{ id: "bluefin-tuna", depth: "deep", tier: "epic", weight: 30 },
	{ id: "shark", depth: "deep", tier: "epic", weight: 20 },
	{ id: "barracuda-epic", depth: "deep", tier: "epic", weight: 15 },
	// Abyss — legendary, plus the whale jackpot
	{ id: "lanternfish", depth: "abyss", tier: "legendary", weight: 40 },
	{ id: "jellyfish", depth: "abyss", tier: "legendary", weight: 30 },
	{ id: "starfish", depth: "abyss", tier: "legendary", weight: 22 },
	{ id: "whale", depth: "abyss", tier: "jackpot", weight: 8 },
	// Trench — the Kraken, nothing else
	{ id: "kraken", depth: "trench", tier: "jackpot", weight: 100 }
];
