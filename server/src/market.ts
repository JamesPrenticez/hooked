// The fish market and the catch (ARCHITECTURE.md §20, §21): the prices a round pays and the fish the hook lands.
// Pure and deterministic in the stream they are drawn from, so POST /api/game/verify can recompute a round from its
// seeds. The odds and relative prices live in constants.ts.

import { DEPTHS, FISH, type FishDef, type Level, LEVELS, PRICE_POOLS, RTP, VOLATILITIES } from "./constants.ts";
import { fromCents } from "./money.ts";
import { rollInt, rollWeighted, shuffle } from "./rng.ts";
import type { DepthId, FishingOutcome, MarketEntry, Volatility } from "./rounds.ts";

type PricedDepth = Exclude<DepthId, "jackpot">;

const PRICED: PricedDepth[] = ["shallow", "reef", "deep", "abyss"];

const mean = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;

/** A volatility's prices for every zone, as multiples of the stake: `PRICE_POOLS` scaled so the volatility returns
 *  RTP once the Kraken has taken its fixed share. Whole cents, since that is what a round pays out in. */
function priceZones({ odds, jackpot }: Level): Record<DepthId, number[]> {
	const total = DEPTHS.reduce((sum, d) => sum + odds[d], 0);
	const chance = (depth: DepthId) => odds[depth] / total;
	const scale =
		(RTP - chance("jackpot") * jackpot) / PRICED.reduce((sum, d) => sum + chance(d) * mean(PRICE_POOLS[d]), 0);
	const zones = Object.fromEntries(PRICED.map(d => [d, PRICE_POOLS[d].map(p => Math.round(p * scale * 100) / 100)]));
	return { ...zones, jackpot: [jackpot] } as Record<DepthId, number[]>;
}

/** What the fish in each zone can be worth, per volatility. Exported for the tests — a client is only ever sent a
 *  round's market. */
export const PRICES = Object.fromEntries(VOLATILITIES.map(v => [v, priceZones(LEVELS[v])])) as Record<
	Volatility,
	Record<DepthId, number[]>
>;

const rosterOf = (depth: DepthId) => FISH.filter(f => f.depth === depth);

/** This round's market: each zone's prices shuffled across its fish, every fish listed once in roster order. */
export function rollMarket(stream: Generator<number>, volatility: Volatility): MarketEntry[] {
	const price = new Map<string, number>();
	for (const depth of DEPTHS) {
		const pool = shuffle(stream, [...PRICES[volatility][depth]]);
		rosterOf(depth).forEach((fish, i) => price.set(fish.id, pool[i]));
	}
	return FISH.map(fish => ({ fish: fish.id, multiplier: fromCents(Math.round(price.get(fish.id)! * 100)) }));
}

/** The catch of `fish` on `market`: the fish, where it lives and what it pays this round. */
export function outcomeFor(fish: FishDef, market: MarketEntry[]): FishingOutcome {
	const { multiplier } = market.find(entry => entry.fish === fish.id)!;
	return { depth: fish.depth, fish: fish.id, tier: fish.tier, multiplier };
}

/** Where the hook dives, then which fish in that zone it lands. Every fish in a zone is as likely as any other, so how
 *  the prices rotate across them can't move a volatility's return. */
export function rollCatch(stream: Generator<number>, volatility: Volatility, market: MarketEntry[]): FishingOutcome {
	const odds = DEPTHS.map(d => LEVELS[volatility].odds[d]);
	const depth = DEPTHS[rollWeighted(stream, odds)];
	const roster = rosterOf(depth);
	return outcomeFor(roster[rollInt(stream, roster.length)], market);
}
