// Run: pnpm test:server  (node --test, no framework)
//
// BUILD_PLAN 3.5 — Mathematical Testing. Proves the server's gambling math is
// correct and hits the GDD's 96% RTP target, without the client or a renderer
// (ARCHITECTURE.md §33). Five buckets:
//
//   1. Unit tests        — resolveBet pays stake × table multiplier, exactly.
//   2. Probability tests  — rollOutcome realises the weight tables.
//   3. RTP simulation     — every selection returns ~96%, blended too.
//   4. Combined bet tests — multiple bets resolve independently; combining
//                           them does not distort RTP.
//   5. Edge case tests    — stake limits, half-cent rounding, total losses,
//                           the rarest outcome, off-table selections.
//
// rounds.test.ts already covers rollOutcome determinism, roster consistency,
// per-branch coverage and the depth ordering — not repeated here.

import assert from "node:assert/strict";
import { test } from "node:test";

import { config } from "./config.ts";
import { DEPTH_MULTIPLIERS, DEPTH_WEIGHTS, FISH } from "./constants.ts";
import { toCents } from "./money.ts";
import { type Bet, type DepthId, type FishingOutcome, resolveBet, rollOutcome } from "./rounds.ts";

// --- The test's own model of the probabilities, derived straight from the
// weight tables. Deliberately not a server import: a bug in how the server
// turns weights into draws must not be able to hide behind a shared helper.

const DEPTHS = Object.keys(DEPTH_WEIGHTS) as DepthId[];
const depthWeightTotal = DEPTHS.reduce((sum, d) => sum + DEPTH_WEIGHTS[d], 0);
const rosterOf = (d: DepthId) => FISH.filter(f => f.depth === d);

const pDepth = (d: DepthId) => DEPTH_WEIGHTS[d] / depthWeightTotal;
const pFish = (id: string) => {
	const f = FISH.find(x => x.id === id);
	assert.ok(f, `unknown fish ${id}`);
	const rosterWeight = rosterOf(f.depth).reduce((sum, x) => sum + x.weight, 0);
	return pDepth(f.depth) * (f.weight / rosterWeight);
};

const unitBet = (type: Bet["type"], selection: string): Bet => ({ type, selection, amount: "1.00" });
const allSelections: Bet[] = [...DEPTHS.map(d => unitBet("depth", d)), ...FISH.map(f => unitBet("fish", f.id))];
const key = (b: Bet) => `${b.type}:${b.selection}`;
const pSelection = (b: Bet) => (b.type === "depth" ? pDepth(b.selection as DepthId) : pFish(b.selection));
const multiplierOf = (b: Bet) =>
	b.type === "depth"
		? DEPTH_MULTIPLIERS[b.selection as DepthId]
		: (FISH.find(f => f.id === b.selection)?.multiplier ?? 0);

const outcomeFor = (fishId: string): FishingOutcome => {
	const f = FISH.find(x => x.id === fishId);
	assert.ok(f, `unknown fish ${fishId}`);
	return { depth: f.depth, fish: f.id, tier: f.tier };
};

// --- One shared simulation, run once at load. Deterministic in the seed pair
// (rollOutcome is pure in its triple), so every run draws the same 200k
// outcomes and the tolerances below only have to clear this one sample.

const SIM_N = 200_000;
const SIM_SERVER_SEED = "math-test-server-seed";
const SIM_CLIENT_SEED = "math-test-client-seed";

const sim = (() => {
	const depthHits = Object.fromEntries(DEPTHS.map(d => [d, 0])) as Record<string, number>;
	const fishHits = Object.fromEntries(FISH.map(f => [f.id, 0])) as Record<string, number>;
	const staked = Object.fromEntries(allSelections.map(b => [key(b), 0])) as Record<string, number>;
	const returned = Object.fromEntries(allSelections.map(b => [key(b), 0])) as Record<string, number>;

	for (let nonce = 0; nonce < SIM_N; nonce++) {
		const outcome = rollOutcome(SIM_SERVER_SEED, SIM_CLIENT_SEED, nonce);
		depthHits[outcome.depth]++;
		fishHits[outcome.fish]++;
		for (const bet of allSelections) {
			staked[key(bet)] += 100; // 1.00 in cents
			returned[key(bet)] += toCents(resolveBet(bet, outcome).payout);
		}
	}
	return { depthHits, fishHits, staked, returned };
})();

const simRtp = (b: Bet) => sim.returned[key(b)] / sim.staked[key(b)];

// ===========================================================================
// 1. Unit tests — the pure (bet, outcome) → payout contract
// ===========================================================================

test("resolveBet — a winning bet pays exactly round(stake × table multiplier), for every selection", () => {
	for (const bet of allSelections) {
		// Build the one outcome this selection wins against.
		const outcome =
			bet.type === "depth" ? outcomeFor(rosterOf(bet.selection as DepthId)[0].id) : outcomeFor(bet.selection);
		const r = resolveBet({ ...bet, amount: "3.33" }, outcome);
		assert.equal(r.won, true, key(bet));
		assert.equal(toCents(r.payout), Math.round(333 * multiplierOf(bet)), `${key(bet)} payout`);
		assert.equal(r.multiplier, (multiplierOf(bet) as number).toFixed(2), `${key(bet)} multiplier string`);
	}
});

test("resolveBet — a losing bet reports the table multiplier and a zero payout", () => {
	const outcome = outcomeFor("shark"); // deep / shark / epic
	const miss = resolveBet(unitBet("fish", "whale"), outcome);
	assert.equal(miss.won, false);
	assert.equal(miss.payout, "0.00");
	assert.equal(miss.multiplier, "171.43"); // still says what it would have paid
});

// ===========================================================================
// 2. Probability tests — rollOutcome realises the weight tables
// ===========================================================================

test("measured depth frequencies match P(depth) from DEPTH_WEIGHTS", () => {
	for (const d of DEPTHS) {
		const measured = sim.depthHits[d] / SIM_N;
		const expected = pDepth(d);
		assert.ok(
			Math.abs(measured / expected - 1) < 0.1,
			`${d}: measured ${measured.toFixed(5)} vs expected ${expected.toFixed(5)}`
		);
	}
});

test("measured fish frequencies match P(fish) = P(depth) × in-depth weight share", () => {
	for (const f of FISH) {
		const measured = sim.fishHits[f.id] / SIM_N;
		const expected = pFish(f.id);
		assert.ok(
			Math.abs(measured / expected - 1) < 0.15, // whale P≈0.0056 — wide enough for its sampling noise
			`${f.id}: measured ${measured.toFixed(5)} vs expected ${expected.toFixed(5)}`
		);
	}
});

test("depth probabilities sum to 1 and fish probabilities sum to 1", () => {
	const depthSum = DEPTHS.reduce((s, d) => s + pDepth(d), 0);
	const fishSum = FISH.reduce((s, f) => s + pFish(f.id), 0);
	assert.ok(Math.abs(depthSum - 1) < 1e-9, `depth sum ${depthSum}`);
	assert.ok(Math.abs(fishSum - 1) < 1e-9, `fish sum ${fishSum}`);
});

// ===========================================================================
// 3. RTP simulation — the 96% target (GDD "Mathematical Model & RTP")
// ===========================================================================

test("theoretical RTP of every selection sits in the 96% ± 0.5% band", () => {
	for (const bet of allSelections) {
		const rtp = pSelection(bet) * multiplierOf(bet);
		assert.ok(rtp > 0.955 && rtp < 0.965, `${key(bet)}: ${(rtp * 100).toFixed(3)}%`);
	}
});

test("simulated blended RTP — a unit bet on every selection, over 200k rounds — converges on 96%", () => {
	const staked = allSelections.reduce((s, b) => s + sim.staked[key(b)], 0);
	const returned = allSelections.reduce((s, b) => s + sim.returned[key(b)], 0);
	const rtp = returned / staked;
	assert.ok(rtp > 0.95 && rtp < 0.975, `blended RTP ${(rtp * 100).toFixed(4)}%`);
});

test("simulated RTP of the frequently-hit selections (P ≥ 9%) lands within 2% of 96%", () => {
	// These come up often enough that 200k rounds pin them tight. Rarer, higher-
	// multiplier selections (trench, swordfish, whale, kraken, ...) stay noisy at
	// this N — the theoretical-band test above is their guarantee, and the
	// runaway check below is their floor/ceiling.
	const steady = allSelections.filter(b => pSelection(b) >= 0.09);
	assert.ok(steady.length >= 6, "expected several high-probability selections");
	for (const bet of steady) {
		assert.ok(Math.abs(simRtp(bet) - 0.96) < 0.02, `${key(bet)}: ${(simRtp(bet) * 100).toFixed(3)}%`);
	}
});

test("no selection is a runaway win or a dead loss in simulation", () => {
	for (const bet of allSelections) {
		assert.ok(simRtp(bet) > 0.85 && simRtp(bet) < 1.1, `${key(bet)}: ${(simRtp(bet) * 100).toFixed(2)}%`);
	}
});

// ===========================================================================
// 4. Combined bet tests — many bets, one outcome (GDD: a depth + a fish bet
//    can both win; combining bets must not move the RTP)
// ===========================================================================

/** Mirrors openRound's aggregation, kept pure for the unit level. */
function settle(bets: Bet[], outcome: FishingOutcome) {
	const results = bets.map(b => resolveBet(b, outcome));
	const total = results.reduce((s, r) => s + toCents(r.payout), 0);
	const wagered = bets.reduce((s, b) => s + toCents(b.amount), 0);
	return { results, total, wagered, net: total - wagered };
}

test("a depth bet and a fish bet on the same outcome both win and both pay", () => {
	const outcome = outcomeFor("shark"); // deep / shark / epic
	const { results, total, net } = settle(
		[
			{ type: "depth", selection: "deep", amount: "10.00" },
			{ type: "fish", selection: "shark", amount: "10.00" }
		],
		outcome
	);
	assert.deepEqual(
		results.map(r => r.won),
		[true, true]
	);
	assert.equal(total, Math.round(1000 * DEPTH_MULTIPLIERS.deep) + Math.round(1000 * 28.24));
	assert.equal(net, total - 2000);
});

test("bets in one slip resolve independently — winners pay, losers do not drag them down", () => {
	const outcome = outcomeFor("shark");
	const { results, total, wagered, net } = settle(
		[
			{ type: "depth", selection: "deep", amount: "10.00" }, // hit
			{ type: "fish", selection: "shark", amount: "10.00" }, // hit
			{ type: "fish", selection: "whale", amount: "10.00" }, // miss
			{ type: "depth", selection: "shallow", amount: "10.00" } // miss
		],
		outcome
	);
	assert.deepEqual(
		results.map(r => r.won),
		[true, true, false, false]
	);
	assert.equal(wagered, 4000);
	assert.equal(total, toCents(results[0].payout) + toCents(results[1].payout));
	assert.equal(net, total - 4000);
});

test("combining a depth bet with a fish bet does not distort RTP", () => {
	// Same 200k stream, a unit bet on { reef, napoleon } every round. Both are
	// frequent enough to converge; the pair's RTP is still ~96%.
	let staked = 0;
	let returned = 0;
	const slip: Bet[] = [unitBet("depth", "reef"), unitBet("fish", "napoleon")];
	for (let nonce = 0; nonce < SIM_N; nonce++) {
		const outcome = rollOutcome(SIM_SERVER_SEED, SIM_CLIENT_SEED, nonce);
		for (const bet of slip) {
			staked += 100;
			returned += toCents(resolveBet(bet, outcome).payout);
		}
	}
	const rtp = returned / staked;
	assert.ok(rtp > 0.94 && rtp < 0.98, `combined RTP ${(rtp * 100).toFixed(4)}%`);
});

// ===========================================================================
// 5. Edge case tests
// ===========================================================================

test("stake at the configured min and max resolves cleanly on the biggest multiplier", () => {
	const outcome = outcomeFor("whale"); // abyss / whale / jackpot, ×171.43
	for (const amount of [config.minBet, config.maxBet]) {
		const r = resolveBet({ type: "fish", selection: "whale", amount }, outcome);
		assert.equal(r.won, true);
		assert.equal(toCents(r.payout), Math.round(toCents(amount) * 171.43));
		assert.ok(Number.isFinite(toCents(r.payout)) && !r.payout.includes("NaN"));
	}
});

test("half-a-cent payouts round up, not to even", () => {
	// 0.50 × shrimp 7.11 = 3.555 exactly → 3.56 (Math.round is half-up, not banker's).
	const r = resolveBet({ type: "fish", selection: "shrimp", amount: "0.50" }, outcomeFor("shrimp"));
	assert.equal(r.payout, "3.56");
});

test("a round where every bet loses pays zero and nets the full wager back as negative", () => {
	const outcome = outcomeFor("shark"); // deep / shark
	const { total, wagered, net } = settle(
		[
			{ type: "depth", selection: "shallow", amount: "1.00" },
			{ type: "fish", selection: "kraken", amount: "1.00" }
		],
		outcome
	);
	assert.equal(total, 0);
	assert.equal(wagered, 200);
	assert.equal(net, -200);
});

test("the rarest outcome (kraken, P≈0.01) still pays its exact multiplier", () => {
	const outcome = outcomeFor("kraken"); // trench / kraken / jackpot
	assert.equal(resolveBet({ type: "fish", selection: "kraken", amount: "1.00" }, outcome).payout, "96.00");
	assert.equal(resolveBet({ type: "depth", selection: "trench", amount: "1.00" }, outcome).payout, "96.00");
});

test("resolveBet on an off-table selection is a zero, not a NaN, into the wallet", () => {
	// validateBets rejects these upstream — this is the last-ditch guard in multiplierFor.
	const outcome = outcomeFor("shark");
	const r = resolveBet({ type: "fish", selection: "mermaid", amount: "10.00" }, outcome);
	assert.equal(r.won, false);
	assert.equal(r.multiplier, "0.00");
	assert.equal(r.payout, "0.00");
});

test("a large stake on a large multiplier stays exact in integer cents", () => {
	const outcome = outcomeFor("kraken");
	const r = resolveBet({ type: "fish", selection: "kraken", amount: config.maxBet }, outcome);
	assert.equal(r.payout, "48000.00"); // 500.00 × 96
});
