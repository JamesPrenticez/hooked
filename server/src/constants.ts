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

// ponytail: first-pass probability weights AND payout multipliers. The
// structure — weighted depth, then a weighted fish within that depth, each
// selection paying a fixed table multiplier — is final; the numbers are not.
// Milestone 3.5 runs the RTP simulation and tunes weights + multipliers
// together to the GDD's 96% target. Weights are relative, not percentages; the
// roller sums and normalises them. A weight of 0 disables a branch without
// deleting it. Multipliers here are ≈ 0.96 / P(selection) — a rough single-bet
// break-even, deliberately un-tuned until the simulation lands.

/** P(depth) for the first roll. Shallow common, trench rare. */
export const DEPTH_WEIGHTS: Record<DepthId, number> = {
	shallow: 45,
	reef: 30,
	deep: 17,
	abyss: 7,
	trench: 1
};

/** Payout multiplier for a winning `depth` bet. Rarer depth pays more. Mirrors
 *  the fish multipliers below — both get tuned in 3.5. */
export const DEPTH_MULTIPLIERS: Record<DepthId, number> = {
	shallow: 2.1,
	reef: 3.2,
	deep: 5.6,
	abyss: 13.5,
	trench: 95
};

/** Every catchable fish, grouped by depth. A round outcome always names one;
 *  its tier is looked up here, not rolled separately. */
export const FISH: FishDef[] = [
	// Shallow — common, low value
	{ id: "shrimp", depth: "shallow", tier: "small", weight: 30, multiplier: 7 },
	{ id: "sardine", depth: "shallow", tier: "small", weight: 25, multiplier: 8.5 },
	{ id: "blue-cod", depth: "shallow", tier: "small", weight: 20, multiplier: 10.5 },
	{ id: "barracuda", depth: "shallow", tier: "small", weight: 15, multiplier: 14 },
	{ id: "puffer", depth: "shallow", tier: "small", weight: 10, multiplier: 21 },
	// Reef — mid value
	{ id: "napoleon", depth: "reef", tier: "large", weight: 35, multiplier: 9 },
	{ id: "turtle", depth: "reef", tier: "large", weight: 30, multiplier: 10.5 },
	{ id: "swordfish", depth: "reef", tier: "large", weight: 20, multiplier: 16 },
	{ id: "king-crab", depth: "reef", tier: "large", weight: 15, multiplier: 21 },
	// Deep — rare, high value
	{ id: "manta-ray", depth: "deep", tier: "epic", weight: 35, multiplier: 16 },
	{ id: "bluefin-tuna", depth: "deep", tier: "epic", weight: 30, multiplier: 18.5 },
	{ id: "shark", depth: "deep", tier: "epic", weight: 20, multiplier: 28 },
	{ id: "barracuda-epic", depth: "deep", tier: "epic", weight: 15, multiplier: 37 },
	// Abyss — legendary, plus the whale jackpot
	{ id: "lanternfish", depth: "abyss", tier: "legendary", weight: 40, multiplier: 34 },
	{ id: "jellyfish", depth: "abyss", tier: "legendary", weight: 30, multiplier: 45 },
	{ id: "starfish", depth: "abyss", tier: "legendary", weight: 22, multiplier: 62 },
	{ id: "whale", depth: "abyss", tier: "jackpot", weight: 8, multiplier: 170 },
	// Trench — the Kraken, nothing else
	{ id: "kraken", depth: "trench", tier: "jackpot", weight: 100, multiplier: 95 }
];

/** Valid `selection` values for a `fish` bet — every roster id (§13 bet validation). */
export const FISH_IDS: ReadonlySet<string> = new Set(FISH.map(f => f.id));
