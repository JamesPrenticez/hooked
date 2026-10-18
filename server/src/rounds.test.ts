// Run: pnpm test:server  (node --test, no framework)
//
// Pure unit tests for outcome generation (BUILD_PLAN 3.1) and payout resolution
// (BUILD_PLAN 3.3). No HTTP, no state — rollOutcome is deterministic in its seed
// triple and resolveBet is a pure (bet, outcome) → result. The heavy RTP /
// frequency simulation is milestone 3.5; this proves the hierarchy holds, the
// weighted roll reaches every branch, and each bet pays its table multiplier.

import assert from "node:assert/strict";
import { test } from "node:test";

import { DEPTH_MULTIPLIERS, FISH } from "./constants.ts";
import { type FishingOutcome, resolveBet, rollOutcome } from "./rounds.ts";

const depthOf = new Map(FISH.map(f => [f.id, f.depth]));
const tierOf = new Map(FISH.map(f => [f.id, f.tier]));

test("rollOutcome is deterministic in (serverSeed, clientSeed, nonce)", () => {
	for (const nonce of [0, 1, 7, 42, 999]) {
		assert.deepEqual(rollOutcome("s", "c", nonce), rollOutcome("s", "c", nonce));
	}
	// Different seeds ⇒ independent streams. Not a per-nonce guarantee, but the
	// odds of five outcomes colliding across two seeds are vanishing.
	const a = [0, 1, 2, 3, 4].map(n => JSON.stringify(rollOutcome("alpha", "x", n)));
	const b = [0, 1, 2, 3, 4].map(n => JSON.stringify(rollOutcome("beta", "x", n)));
	assert.notDeepEqual(a, b);
});

test("every rolled outcome is roster-consistent: fish sits in its depth, tier matches the fish", () => {
	for (let nonce = 0; nonce < 1000; nonce++) {
		const { depth, fish, tier } = rollOutcome("consistency", "check", nonce);
		assert.equal(depthOf.get(fish), depth, `nonce ${nonce}: ${fish} not in ${depth}`);
		assert.equal(tierOf.get(fish), tier, `nonce ${nonce}: ${fish} tier`);
	}
});

test("the weighted roll reaches every depth and every fish over enough draws", () => {
	const depths = new Set<string>();
	const fish = new Set<string>();
	for (let nonce = 0; nonce < 5000; nonce++) {
		const o = rollOutcome("coverage", "check", nonce);
		depths.add(o.depth);
		fish.add(o.fish);
	}
	assert.equal(depths.size, 5, `missing depths: ${[...depths]}`);
	assert.equal(fish.size, FISH.length, `only hit ${fish.size}/${FISH.length} fish`);
});

test("common depths outrank rare ones at the first-pass weights", () => {
	const count: Record<string, number> = {
		shallow: 0,
		reef: 0,
		deep: 0,
		abyss: 0,
		jackpot: 0
	};
	for (let nonce = 0; nonce < 6000; nonce++) count[rollOutcome("ordering", "check", nonce).depth]++;
	assert.ok(count.shallow > count.reef, `shallow ${count.shallow} !> reef ${count.reef}`);
	assert.ok(count.reef > count.deep, `reef ${count.reef} !> deep ${count.deep}`);
	assert.ok(count.deep > count.abyss, `deep ${count.deep} !> abyss ${count.abyss}`);
	assert.ok(count.abyss > count.jackpot, `abyss ${count.abyss} !> jackpot ${count.jackpot}`);
});

// --- Payout resolution (BUILD_PLAN 3.3) ---

const OUTCOME: FishingOutcome = { depth: "deep", fish: "shark", tier: "epic" };

test("resolveBet — depth bet pays DEPTH_MULTIPLIERS on a hit, zero on a miss", () => {
	const hit = resolveBet({ type: "depth", selection: "deep", amount: "10.00" }, OUTCOME);
	assert.equal(hit.won, true);
	assert.equal(hit.multiplier, "5.65"); // DEPTH_MULTIPLIERS.deep = 5.65
	assert.equal(hit.payout, "56.50"); // 10.00 × 5.65

	const miss = resolveBet({ type: "depth", selection: "shallow", amount: "10.00" }, OUTCOME);
	assert.equal(miss.won, false);
	assert.equal(miss.payout, "0.00");
	assert.equal(miss.multiplier, "2.13"); // still reports what it would have paid
});

test("resolveBet — fish bet pays the roster multiplier on a hit, zero on a miss", () => {
	const hit = resolveBet({ type: "fish", selection: "shark", amount: "4.00" }, OUTCOME);
	assert.equal(hit.won, true);
	assert.equal(hit.multiplier, "36.71"); // FISH shark multiplier
	assert.equal(hit.payout, "146.84"); // 4.00 × 36.71

	const miss = resolveBet({ type: "fish", selection: "whale", amount: "4.00" }, OUTCOME);
	assert.equal(miss.won, false);
	assert.equal(miss.payout, "0.00");
});

test("resolveBet — fractional multiplier and odd stake round to whole cents", () => {
	// sardine ×7.68 on 3.33 = 25.5744 → 25.57 (banker-free Math.round, half up)
	const r = resolveBet({ type: "fish", selection: "sardine", amount: "3.33" }, { ...OUTCOME, fish: "sardine" });
	assert.equal(r.payout, "25.57");
});

test("every depth id and every fish id has a payout multiplier above 1x", () => {
	for (const [depth, m] of Object.entries(DEPTH_MULTIPLIERS)) assert.ok(m > 1, `${depth} multiplier ${m}`);
	for (const f of FISH) assert.ok(f.multiplier > 1, `${f.id} multiplier ${f.multiplier}`);
});
