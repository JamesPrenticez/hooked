// Run: pnpm test:server  (node --test, no framework)
//
// BUILD_PLAN 3.5 / 30 — Mathematical Testing. Proves the market model's maths
// is correct and hits the GDD's 96% RTP target, without the client or a
// renderer (ARCHITECTURE.md §33). Five buckets:
//
//   1. Tables       — the price pools fit the roster, and prices are real.
//   2. RTP          — every volatility returns 96%, however the market is arranged.
//   3. Probability  — rollRound realises the odds; the market is fixed.
//   4. Simulation   — a long run of rounds converges on 96% at every volatility.
//   5. Edge cases   — payout rounding and the stake limits on the biggest prize.
//
// rounds.test.ts covers rollRound's determinism and roster consistency — not repeated here.

import assert from "node:assert/strict";
import { test } from "node:test";

import { config } from "./config.ts";
import { BONUS_MULTIPLIERS, BONUS_ODDS, DEPTHS, FISH, LEVELS, RTP, VOLATILITIES } from "./constants.ts";
import { ESCAPE, PRICES } from "./market.ts";
import { toCents } from "./money.ts";
import { type DepthId, payoutCents, rollRound, type Volatility } from "./rounds.ts";
import { CHINOOK_FROM, CRANE_FROM, HELICOPTER_FROM } from "../../src/utils/simExtraction.ts";

// --- The test's own model of the odds and the returns, derived straight from
// the tables. Deliberately not a server helper: a bug in how the server turns
// odds into draws must not be able to hide behind a shared function.

const mean = (values: number[]) => values.reduce((sum, v) => sum + v, 0) / values.length;
const rosterOf = (d: DepthId) => FISH.filter(f => f.depth === d);
const oddsTotal = (v: Volatility) => DEPTHS.reduce((sum, d) => sum + LEVELS[v].odds[d], 0);
const pZone = (v: Volatility, d: DepthId) => LEVELS[v].odds[d] / oddsTotal(v);

const bonusWeight = BONUS_MULTIPLIERS.reduce((sum, b) => sum + b.weight, 0);
/** What the bonus multiplies a landed catch by on average: one landed catch in BONUS_ODDS pays a random bonus on top. */
const bonusFactor =
	1 + (BONUS_MULTIPLIERS.reduce((sum, b) => sum + b.value * b.weight, 0) / bonusWeight - 1) / BONUS_ODDS;

/** What a volatility returns per unit staked, given what each zone's fish are listed at on average, bonus included. */
const returnOf = (v: Volatility, zoneMean: (d: DepthId) => number) =>
	bonusFactor * DEPTHS.reduce((sum, d) => sum + pZone(v, d) * zoneMean(d) * (d === "jackpot" ? 1 : 1 - ESCAPE[v]), 0);

/** The share of rounds whose payout (price × bonus) calls in at least the crane, by walking every price and bonus. */
const craneShare = (v: Volatility) => {
	let share = 0;
	for (const d of DEPTHS) {
		const prices = PRICES[v][d];
		const landed = pZone(v, d) * (d === "jackpot" ? 1 : 1 - ESCAPE[v]);
		for (const price of prices) {
			const per = landed / prices.length;
			if (price >= CRANE_FROM) share += per * (1 - 1 / BONUS_ODDS);
			for (const b of BONUS_MULTIPLIERS)
				if (price * b.value >= CRANE_FROM) share += (per / BONUS_ODDS) * (b.weight / bonusWeight);
		}
	}
	return share;
};

// ===========================================================================
// 1. Tables — the pools fit the roster
// ===========================================================================

test("every price pool holds exactly one price per fish in its zone", () => {
	for (const d of DEPTHS) {
		for (const v of VOLATILITIES) assert.equal(PRICES[v][d].length, rosterOf(d).length, `${v} ${d}`);
	}
});

test("a landed fish always pays more than the bet", () => {
	for (const v of VOLATILITIES) {
		for (const d of DEPTHS) for (const price of PRICES[v][d]) assert.ok(price > 1, `${v} ${d}: ${price}`);
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

test("the hook dives shallower, and the jackpot grows, as the volatility rises", () => {
	const deep = (v: Volatility) => pZone(v, "deep") + pZone(v, "abyss") + pZone(v, "jackpot");
	assert.ok(deep("low") > deep("medium") && deep("medium") > deep("high"), "dive odds must fall");
	assert.ok(PRICES.low.jackpot[0] < PRICES.medium.jackpot[0] && PRICES.medium.jackpot[0] < PRICES.high.jackpot[0]);
	for (const v of VOLATILITIES) assert.ok(pZone(v, "shallow") > pZone(v, "abyss"), `${v}: shallow is the common catch`);
});

// ===========================================================================
// 2. RTP — the 96% target (GDD "Mathematical Model & RTP")
// ===========================================================================

test("theoretical RTP — every volatility returns 96% (bonus included, to within the cent rounding of the prices)", () => {
	for (const v of VOLATILITIES) {
		const rtp = returnOf(v, d => mean(PRICES[v][d]));
		assert.ok(Math.abs(rtp - RTP) < 0.005, `${v}: ${(rtp * 100).toFixed(3)}%`);
	}
});

test("about 1 round in 5 calls in the crane or better, at every volatility", () => {
	assert.ok(CRANE_FROM < HELICOPTER_FROM && HELICOPTER_FROM < CHINOOK_FROM);
	for (const v of VOLATILITIES) {
		const share = craneShare(v);
		assert.ok(share > 0.15 && share < 0.3, `${v}: ${(share * 100).toFixed(1)}%`);
	}
});

test("the listed market returns 96% too", () => {
	for (const v of VOLATILITIES) {
		const { market } = rollRound("arrangement", "check", 0, v);
		const price = new Map(market.map(e => [e.fish, Number(e.multiplier)]));
		const rtp = returnOf(v, d => mean(rosterOf(d).map(f => price.get(f.id)!)));
		assert.ok(Math.abs(rtp - RTP) < 0.005, `${v}: ${(rtp * 100).toFixed(3)}%`);
	}
});

// ===========================================================================
// 3. Probability — the catch follows the odds
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

test("the market is fixed: every round of a volatility lists the same prices", () => {
	for (const v of VOLATILITIES) {
		const first = JSON.stringify(rollRound("fixed", "check", 0, v).market);
		for (let nonce = 1; nonce < 20; nonce++)
			assert.equal(JSON.stringify(rollRound("fixed", "check", nonce, v).market), first);
	}
});

test("the Kraken is listed at the jackpot", () => {
	for (const v of VOLATILITIES) {
		const kraken = rollRound("kraken", "check", 0, v).market.find(e => e.fish === "kraken")!;
		assert.equal(Number(kraken.multiplier), PRICES[v].jackpot[0]);
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

// ===========================================================================
// 5. Bonus — the highlighted fish
// ===========================================================================

test("every round highlights 1 to 5 distinct fish, in roster order, each with a bonus of 2x to 10x", () => {
	const order = FISH.map(f => f.id);
	for (let nonce = 0; nonce < 500; nonce++) {
		const { bonus } = rollRound("bonus", "check", nonce, "medium");
		assert.ok(bonus.length >= 1 && bonus.length <= 5, `${bonus.length} fish`);
		const ids = bonus.map(b => b.fish);
		assert.deepEqual(
			ids,
			order.filter(id => ids.includes(id))
		);
		for (const b of bonus) assert.ok(Number(b.multiplier) >= 2 && Number(b.multiplier) <= 10);
	}
});

test("a highlighted catch pays its bonus on top; an ordinary one is never highlighted", () => {
	let hits = 0;
	for (let nonce = 0; nonce < 60_000; nonce++) {
		const { outcome, bonus, market } = rollRound("bonus-hit", "check", nonce, "low");
		const hit = bonus.find(b => b.fish === outcome.fish);
		if (!hit) continue;
		hits++;
		const price = Number(market.find(e => e.fish === outcome.fish)!.multiplier);
		assert.ok(Math.abs(Number(outcome.multiplier) - price * Number(hit.multiplier)) < 0.01);
	}
	assert.ok(hits > 1_100 && hits < 1_800, `${hits} hits in 60000 rounds`);
});

test("a hooked fish gets away at the volatility's escape chance, pays nothing, and is never the Kraken or highlighted", () => {
	for (const v of VOLATILITIES) {
		let escapes = 0;
		let landed = 0;
		for (let nonce = 0; nonce < 20_000; nonce++) {
			const { outcome, bonus } = rollRound("escape", "check", nonce, v);
			if (outcome.depth !== "jackpot") landed++;
			if (!outcome.escaped) continue;
			escapes++;
			assert.equal(Number(outcome.multiplier), 0);
			assert.notEqual(outcome.depth, "jackpot");
			assert.ok(!bonus.some(b => b.fish === outcome.fish), "an escaped fish is never highlighted");
		}
		assert.ok(Math.abs(escapes / landed - ESCAPE[v]) < 0.02, `${v}: ${escapes}/${landed}`);
	}
});
