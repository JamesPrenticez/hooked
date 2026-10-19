// The fish market and the catch (ARCHITECTURE.md §20, §21): the prices a round pays and the fish the hook lands.
// Pure and deterministic in the stream they are drawn from, so POST /api/game/verify can recompute a round from its
// seeds. The odds and relative prices live in constants.ts.

import {
	BONUS_MAX_FISH,
	BONUS_MULTIPLIERS,
	BONUS_ODDS,
	DEPTHS,
	FISH,
	type FishDef,
	type Level,
	LEVELS,
	PRICE_POOLS,
	RTP,
	VOLATILITIES
} from "./constants.ts";
import { fromCents, toCents } from "./money.ts";
import { rollInt, rollWeighted } from "./rng.ts";
import type { BonusEntry, DepthId, FishingOutcome, MarketEntry, Volatility } from "./rounds.ts";

type PricedDepth = Exclude<DepthId, "jackpot">;

const PRICED: PricedDepth[] = ["shallow", "reef", "deep", "abyss"];

const mean = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;

const BONUS_WEIGHTS = BONUS_MULTIPLIERS.map(b => b.weight);
const MEAN_BONUS =
	BONUS_MULTIPLIERS.reduce((sum, b) => sum + b.value * b.weight, 0) / BONUS_WEIGHTS.reduce((a, b) => a + b, 0);

/** What the bonus multiplies a round's expected payout by: one round in `BONUS_ODDS` pays its mean bonus. It is paid on
 *  top of RTP, not out of it. */
export const BONUS_FACTOR = 1 + (MEAN_BONUS - 1) / BONUS_ODDS;

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

/** The market: each zone's prices in ascending order across its fish in roster order, every fish listed once. Fixed —
 *  the same every round for a volatility. */
export function rollMarket(volatility: Volatility): MarketEntry[] {
	const price = new Map<string, number>();
	for (const depth of DEPTHS) {
		const pool = [...PRICES[volatility][depth]].sort((a, b) => a - b);
		rosterOf(depth).forEach((fish, i) => price.set(fish.id, pool[i]));
	}
	return FISH.map(fish => ({ fish: fish.id, multiplier: fromCents(Math.round(price.get(fish.id)! * 100)) }));
}

/** The catch of `fish` on `market`: the fish, where it lives and what it pays this round — its price. */
export function outcomeFor(fish: FishDef, market: MarketEntry[]): FishingOutcome {
	const { multiplier } = market.find(entry => entry.fish === fish.id)!;
	return { depth: fish.depth, fish: fish.id, tier: fish.tier, multiplier };
}

/** Where the hook dives, then which fish in that zone it lands. Every fish in a zone is as likely as any other, so
 *  which fish is landed can't move a volatility's return. */
export function rollCatch(stream: Generator<number>, volatility: Volatility, market: MarketEntry[]): FishingOutcome {
	const odds = DEPTHS.map(d => LEVELS[volatility].odds[d]);
	const depth = DEPTHS[rollWeighted(stream, odds)];
	const roster = rosterOf(depth);
	const fish = roster[rollInt(stream, roster.length)];
	return outcomeFor(fish, market);
}

/** The round's highlighted fish, 1 to `BONUS_MAX_FISH` of them in roster order, each with a bonus. The catch is one of
 *  them only on the one round in `BONUS_ODDS` that hits; otherwise it is left out, so a highlight never sits on a
 *  fish that paid. */
export function rollBonus(stream: Generator<number>, caught: string): BonusEntry[] {
	const hit = rollInt(stream, BONUS_ODDS) === 0;
	const count = 1 + rollInt(stream, BONUS_MAX_FISH);
	const pool = FISH.map(f => f.id).filter(id => id !== caught);
	const picked = hit ? [caught] : [];
	while (picked.length < count) picked.push(pool.splice(rollInt(stream, pool.length), 1)[0]);
	return FISH.filter(f => picked.includes(f.id)).map(f => ({
		fish: f.id,
		multiplier: fromCents(BONUS_MULTIPLIERS[rollWeighted(stream, BONUS_WEIGHTS)].value * 100)
	}));
}

/** The catch with its bonus applied: a highlighted fish pays its price times its bonus. */
export function applyBonus(outcome: FishingOutcome, bonus: BonusEntry[]): FishingOutcome {
	const hit = bonus.find(b => b.fish === outcome.fish);
	return hit
		? { ...outcome, multiplier: fromCents(toCents(outcome.multiplier) * (toCents(hit.multiplier) / 100)) }
		: outcome;
}
