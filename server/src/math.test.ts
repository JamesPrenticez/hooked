// Run: pnpm test:server  (node --test, no framework)
//
// BUILD_PLAN 3.5 / 30 — Mathematical Testing. Proves the market model's maths
// is correct and hits the GDD's 96% RTP target, without the client or a
// renderer (ARCHITECTURE.md §33). Five buckets:
//
//   1. Tables       — the price pools fit the roster, and prices are real.
//   2. RTP          — every volatility returns 96%, however the market is arranged.
//   3. Probability  — rollRound realises the odds; the market rotates.
//   4. Simulation   — a long run of rounds converges on 96% at every volatility.
//   5. Edge cases   — payout rounding and the stake limits on the biggest prize.
//
// rounds.test.ts covers rollRound's determinism and roster consistency — not repeated here.

import assert from "node:assert/strict";
import { test } from "node:test";

import { config } from "./config.ts";
import { DEPTHS, FISH, LEVELS, PRICE_POOLS, RTP, VOLATILITIES } from "./constants.ts";
import { PRICES } from "./market.ts";
import { toCents } from "./money.ts";
import { type DepthId, payoutCents, rollRound, type Volatility } from "./rounds.ts";

// --- The test's own model of the odds and the returns, derived straight from
// the tables. Deliberately not a server helper: a bug in how the server turns
// odds into draws must not be able to hide behind a shared function.

const mean = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;
const rosterOf = (d: DepthId) => FISH.filter(f => f.depth === d);
const oddsTotal = (v: Volatility) => DEPTHS.reduce((sum, d) => sum + LEVELS[v].odds[d], 0);
const pZone = (v: Volatility, d: DepthId) => LEVELS[v].odds[d] / oddsTotal(v);

/** What a volatility returns per unit staked, given what each zone's fish pay on average. */
const returnOf = (v: Volatility, zoneMean: (d: DepthId) => number) =>
	DEPTHS.reduce((sum, d) => sum + pZone(v, d) * zoneMean(d), 0);

// ===========================================================================
// 1. Tables — the pools fit the roster
// ===========================================================================

test("every price pool holds exactly one price per fish in its zone", () => {
	for (const d of DEPTHS) {
		for (const v of VOLATILITIES) assert.equal(PRICES[v][d].length, rosterOf(d).length, `${v} ${d}`);
		if (d !== "jackpot") assert.equal(PRICE_POOLS[d].length, rosterOf(d).length, `PRICE_POOLS ${d}`);
	}
});

test("prices are real money, and a deeper zone is worth more than the one above it", () => {
	for (const v of VOLATILITIES) {
		for (const d of DEPTHS) {
			for (const price of PRICES[v][d]) {
				assert.ok(price >= 0.05, `${v} ${d}: ${price} is too small to pay out in cents`);
				assert.ok(Math.abs(price * 100 - Math.round(price * 100)) < 1e-6, `${v} ${d}: ${price} is not whole cents`);
			}
		}
		const means = DEPTHS.map(d => mean(PRICES[v][d]));
		for (let i = 1; i < means.length; i++) assert.ok(means[i] > means[i - 1], `${v}: ${DEPTHS[i]} !> ${DEPTHS[i - 1]}`);
	}
});

test("the hook dives deeper, and the jackpot grows, as the volatility rises", () => {
	const deep = (v: Volatility) => pZone(v, "deep") + pZone(v, "abyss") + pZone(v, "jackpot");
	assert.ok(deep("low") < deep("medium") && deep("medium") < deep("high"), "dive odds must rise");
	assert.ok(PRICES.low.jackpot[0] < PRICES.medium.jackpot[0] && PRICES.medium.jackpot[0] < PRICES.high.jackpot[0]);
	for (const v of VOLATILITIES) assert.ok(pZone(v, "shallow") > pZone(v, "abyss"), `${v}: shallow is the common catch`);
});

// ===========================================================================
// 2. RTP — the 96% target (GDD "Mathematical Model & RTP")
// ===========================================================================

test("theoretical RTP — every volatility returns 96% (to the cent the prices are rounded to)", () => {
	for (const v of VOLATILITIES) {
		const rtp = returnOf(v, d => mean(PRICES[v][d]));
		assert.ok(Math.abs(rtp - RTP) < 0.001, `${v}: ${(rtp * 100).toFixed(3)}%`);
	}
});

test("however the prices are arranged across the fish, the return does not move", () => {
	// Every fish in a zone is as likely as any other, so a round's expected pay is the mean of the prices its zone
	// was dealt — and a shuffle deals the same prices. If rollMarket ever dropped or repeated one, this breaks.
	for (const v of VOLATILITIES) {
		for (let nonce = 0; nonce < 40; nonce++) {
			const { market } = rollRound("arrangement", "check", nonce, v);
			const price = new Map(market.map(e => [e.fish, Number(e.multiplier)]));
			const rtp = returnOf(v, d => mean(rosterOf(d).map(f => price.get(f.id)!)));
			assert.ok(Math.abs(rtp - RTP) < 0.001, `${v} nonce ${nonce}: ${(rtp * 100).toFixed(3)}%`);
		}
	}
});

// ===========================================================================
// 3. Probability — the market rotates, and the catch follows the odds
// ===========================================================================

test("a market lists every fish once, each zone dealt exactly its own prices", () => {
	for (const v of VOLATILITIES) {
		const { market } = rollRound("market", "check", 7, v);
		assert.deepEqual(
			market.map(e => e.fish),
			FISH.map(f => f.id)
		);
		for (const d of DEPTHS) {
			const dealt = rosterOf(d)
				.map(f => Number(market.find(e => e.fish === f.id)!.multiplier))
				.sort((a, b) => a - b);
			assert.deepEqual(
				dealt,
				[...PRICES[v][d]].sort((a, b) => a - b),
				`${v} ${d}`
			);
		}
	}
});

test("prices rotate: a fish is dealt different prices from round to round, and the board never stands still", () => {
	const sharkPrices = new Set<string>();
	let unchanged = 0;
	let last = "";
	for (let nonce = 0; nonce < 300; nonce++) {
		const { market } = rollRound("rotation", "check", nonce, "medium");
		sharkPrices.add(market.find(e => e.fish === "shark")!.multiplier);
		const board = JSON.stringify(market);
		if (board === last) unchanged++;
		last = board;
	}
	assert.ok(sharkPrices.size >= PRICES.medium.deep.length - 1, `shark only ever took ${sharkPrices.size} prices`);
	assert.equal(unchanged, 0);
});

test("the Kraken is the one fish whose price never rotates — it is the only fish in its zone", () => {
	for (const v of VOLATILITIES) {
		for (let nonce = 0; nonce < 20; nonce++) {
			const kraken = rollRound("kraken", "check", nonce, v).market.find(e => e.fish === "kraken")!;
			assert.equal(Number(kraken.multiplier), PRICES[v].jackpot[0]);
		}
	}
});

// ===========================================================================
// 4. Simulation — one shared run per volatility, drawn once at load
// ===========================================================================

const SIM_N = 150_000;

const sims = Object.fromEntries(
	VOLATILITIES.map(v => {
		const zoneHits = Object.fromEntries(DEPTHS.map(d => [d, 0])) as Record<DepthId, number>;
		let paid = 0;
		for (let nonce = 0; nonce < SIM_N; nonce++) {
			const { outcome } = rollRound("math-test-server-seed", "math-test-client-seed", nonce, v);
			zoneHits[outcome.depth]++;
			paid += Number(outcome.multiplier);
		}
		return [v, { zoneHits, rtp: paid / SIM_N }];
	})
) as Record<Volatility, { zoneHits: Record<DepthId, number>; rtp: number }>;

test("measured zone frequencies match the odds of every volatility", () => {
	for (const v of VOLATILITIES) {
		for (const d of DEPTHS) {
			const measured = sims[v].zoneHits[d] / SIM_N;
			const expected = pZone(v, d);
			// The jackpot's 0.1% is only ~150 rounds in this run, so it gets a wider band.
			const tolerance = expected < 0.005 ? 0.35 : 0.06;
			assert.ok(
				Math.abs(measured / expected - 1) < tolerance,
				`${v} ${d}: measured ${measured.toFixed(5)} vs expected ${expected.toFixed(5)}`
			);
		}
	}
});

test("simulated RTP — over a long run, every volatility converges on 96%", () => {
	// The jackpot is a small share of the rounds but a big share of the return at high volatility, so that is
	// where the sample is noisiest; the theoretical test above is the exact guarantee.
	for (const v of VOLATILITIES) {
		assert.ok(Math.abs(sims[v].rtp - RTP) < 0.06, `${v}: ${(sims[v].rtp * 100).toFixed(2)}%`);
	}
});

// ===========================================================================
// 5. Edge cases
// ===========================================================================

test("payoutCents pays stake × multiplier in whole cents, halves rounding up", () => {
	assert.equal(payoutCents(333, "6.00"), 1998);
	assert.equal(payoutCents(100, "0.07"), 7);
	// 0.50 × 24.47 = 12.235 exactly → 12.24 (half up, not banker's — and no float error tipping it down).
	assert.equal(payoutCents(50, "24.47"), 1224);
	assert.equal(payoutCents(1, "0.50"), 1);
});

test("payoutCents is exact in integer cents for the biggest stake on the biggest prize", () => {
	const top = Math.max(...VOLATILITIES.map(v => PRICES[v].jackpot[0]));
	const paid = payoutCents(toCents(config.maxBet), top.toFixed(2));
	assert.equal(paid, toCents(config.maxBet) * top);
	assert.ok(Number.isSafeInteger(paid));
});

test("a stake at the configured minimum still pays whole cents on the smallest price", () => {
	const cheapest = Math.min(...VOLATILITIES.map(v => Math.min(...DEPTHS.flatMap(d => PRICES[v][d]))));
	const paid = payoutCents(toCents(config.minBet), cheapest.toFixed(2));
	assert.ok(Number.isInteger(paid) && paid >= 0);
});
