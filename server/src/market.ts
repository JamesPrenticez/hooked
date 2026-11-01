// The fish market and the catch (ARCHITECTURE.md §20, §21): the prices a round pays and the fish the hook lands.
// Pure and deterministic in the stream they are drawn from, so POST /api/game/verify can recompute a round from its
// seeds. The odds and price ranges live in constants.ts.

import {
	BONUS_MAX_FISH,
	BONUS_MULTIPLIERS,
	BONUS_ODDS,
	DEPTHS,
	FISH,
	type FishDef,
	type Level,
	LEVELS,
	type PricedDepth,
	RTP,
	VOLATILITIES
} from "./constants.ts";
import { fromCents, toCents } from "./money.ts";
import { rollInt, rollWeighted } from "./rng.ts";
import type { BonusEntry, DepthId, FishingOutcome, MarketEntry, Volatility } from "./rounds.ts";

const mean = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;

/** Granularity of the escape roll. */
const ESCAPE_RESOLUTION = 10_000;

const BONUS_WEIGHTS = BONUS_MULTIPLIERS.map(b => b.weight);
const MEAN_BONUS =
	BONUS_MULTIPLIERS.reduce((sum, b) => sum + b.value * b.weight, 0) / BONUS_WEIGHTS.reduce((a, b) => a + b, 0);

/** What the bonus multiplies a landed catch's expected payout by: one round in `BONUS_ODDS` pays its mean bonus. */
export const BONUS_FACTOR = 1 + (MEAN_BONUS - 1) / BONUS_ODDS;

const rosterSize = (depth: DepthId) => FISH.filter(f => f.depth === depth).length;

/** `count` prices spread evenly from `low` to `high`. */
const spread = ([low, high]: [number, number], count: number) =>
	Array.from({ length: count }, (_, i) => low + ((high - low) * i) / (count - 1));

/** The chance a hooked fish gets away (pays 0) for a volatility to return RTP: every landed fish pays above the stake,
 *  so the Kraken, the listed prices and the bonus (which lifts every landed catch by `BONUS_FACTOR` on average) are
 *  fixed and the escape chance takes up the slack. Exported for scripts/solve-payouts.ts. */
export function balanceEscape({ odds, jackpot, prices }: Level): number {
	const total = DEPTHS.reduce((sum, d) => sum + odds[d], 0);
	const worth = (["shallow", "reef", "deep", "abyss"] as PricedDepth[]).reduce(
		(sum, d) => sum + (odds[d] / total) * mean(spread(prices[d], rosterSize(d))),
		0
	);
	const escape = 1 - (RTP - (odds.jackpot / total) * jackpot * BONUS_FACTOR) / (BONUS_FACTOR * worth);
	if (!(escape >= 0 && escape < 1)) throw new Error("the listed prices cannot be balanced to RTP by an escape chance");
	return Math.round(escape * ESCAPE_RESOLUTION) / ESCAPE_RESOLUTION;
}

/** Each volatility's chance that a hooked fish (not the Kraken) gets away. */
export const ESCAPE = Object.fromEntries(VOLATILITIES.map(v => [v, balanceEscape(LEVELS[v])])) as Record<
	Volatility,
	number
>;

/** A volatility's prices for every zone, as multiples of the stake. Whole cents, since that is what a round pays out in. */
function priceZones(level: Level): Record<DepthId, number[]> {
	const zone = (d: PricedDepth) => spread(level.prices[d], rosterSize(d)).map(p => Math.round(p * 100) / 100);
	return {
		shallow: zone("shallow"),
		reef: zone("reef"),
		deep: zone("deep"),
		abyss: zone("abyss"),
		jackpot: [level.jackpot]
	};
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
	return { depth: fish.depth, fish: fish.id, tier: fish.tier, multiplier, escaped: false };
}

/** Where the hook dives, then which fish in that zone it lands. Every fish in a zone is as likely as any other, so
 *  which fish is landed can't move a volatility's return. */
export function rollCatch(stream: Generator<number>, volatility: Volatility, market: MarketEntry[]): FishingOutcome {
	const odds = DEPTHS.map(d => LEVELS[volatility].odds[d]);
	const depth = DEPTHS[rollWeighted(stream, odds)];
	const roster = rosterOf(depth);
	const fish = roster[rollInt(stream, roster.length)];
	const outcome = outcomeFor(fish, market);
	// Drawn for every catch so the stream stays aligned; the Kraken is exempt.
	const escaped = rollInt(stream, ESCAPE_RESOLUTION) < ESCAPE[volatility] * ESCAPE_RESOLUTION;
	return escaped && depth !== "jackpot" ? { ...outcome, multiplier: fromCents(0), escaped: true } : outcome;
}

/** The round's highlighted fish, 1 to `BONUS_MAX_FISH` of them in roster order, each with a bonus. The catch is one of
 *  them only on the one round in `BONUS_ODDS` that hits (and the fish does not get away); otherwise it is left out, so a highlight never sits on a
 *  fish that paid. */
export function rollBonus(stream: Generator<number>, caught: string, escaped: boolean): BonusEntry[] {
	const hit = rollInt(stream, BONUS_ODDS) === 0 && !escaped;
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
