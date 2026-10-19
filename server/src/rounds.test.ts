// Run: pnpm test:server  (node --test, no framework)
//
// Pure unit tests for round generation (BUILD_PLAN 3.1, 30). No HTTP, no state —
// rollRound is deterministic in its seed triple and volatility. The heavy RTP /
// frequency simulation is in math.test.ts; this proves the roll is reproducible,
// the catch always agrees with the roster and the market, and the weighted roll
// reaches every branch.

import assert from "node:assert/strict";
import { test } from "node:test";

import { DEPTHS, FISH, VOLATILITIES } from "./constants.ts";
import { rollRound } from "./rounds.ts";
import { FISH as CLIENT_FISH } from "../../src/constants/fish.ts";

const depthOf = new Map(FISH.map(f => [f.id, f.depth]));
const tierOf = new Map(FISH.map(f => [f.id, f.tier]));

test("the client's fish roster mirrors the server's: the same fish, in the same zones", () => {
	const byId = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id);
	const pairs = (fish: { id: string; depth: string }[]) => [...fish].sort(byId).map(f => [f.id, f.depth]);
	assert.deepEqual(pairs(CLIENT_FISH), pairs(FISH));
});

test("rollRound is deterministic in (serverSeed, clientSeed, nonce, volatility)", () => {
	for (const v of VOLATILITIES) {
		for (const nonce of [0, 1, 7, 42, 999]) {
			assert.deepEqual(rollRound("s", "c", nonce, v), rollRound("s", "c", nonce, v));
		}
	}
	// Different seeds ⇒ independent streams. Not a per-nonce guarantee, but the
	// odds of five rounds colliding across two seeds are vanishing.
	const a = [0, 1, 2, 3, 4].map(n => JSON.stringify(rollRound("alpha", "x", n, "medium")));
	const b = [0, 1, 2, 3, 4].map(n => JSON.stringify(rollRound("beta", "x", n, "medium")));
	assert.notDeepEqual(a, b);
});

test("the same seeds deal a different market at a different volatility", () => {
	const low = rollRound("s", "c", 3, "low").market.map(e => e.multiplier);
	const high = rollRound("s", "c", 3, "high").market.map(e => e.multiplier);
	assert.notDeepEqual(low, high);
});

test("every rolled outcome is roster-consistent: fish sits in its depth, tier matches, and it pays its market price (times its bonus, if highlighted)", () => {
	for (const v of VOLATILITIES) {
		for (let nonce = 0; nonce < 500; nonce++) {
			const rolled = rollRound("consistency", "check", nonce, v);
			const { market, outcome } = rolled;
			const { depth, fish, tier, multiplier } = outcome;
			assert.equal(depthOf.get(fish), depth, `nonce ${nonce}: ${fish} not in ${depth}`);
			assert.equal(tierOf.get(fish), tier, `nonce ${nonce}: ${fish} tier`);
			const price = Number(market.find(e => e.fish === fish)!.multiplier);
			const bonus = rolled.bonus.find(b => b.fish === fish);
			assert.ok(
				Math.abs(Number(multiplier) - price * Number(bonus?.multiplier ?? 1)) < 0.01,
				`nonce ${nonce}: ${fish} pays ${multiplier}`
			);
		}
	}
});

test("the weighted roll reaches every depth and every fish over enough draws", () => {
	const depths = new Set<string>();
	const fish = new Set<string>();
	for (let nonce = 0; nonce < 20_000; nonce++) {
		const { outcome } = rollRound("coverage", "check", nonce, "high");
		depths.add(outcome.depth);
		fish.add(outcome.fish);
	}
	assert.equal(depths.size, DEPTHS.length, `missing depths: ${[...depths]}`);
	assert.equal(fish.size, FISH.length, `only hit ${fish.size}/${FISH.length} fish`);
});

test("common depths outrank rare ones at every volatility", () => {
	for (const v of VOLATILITIES) {
		const count: Record<string, number> = { shallow: 0, reef: 0, deep: 0, abyss: 0, jackpot: 0 };
		for (let nonce = 0; nonce < 6000; nonce++) count[rollRound("ordering", "check", nonce, v).outcome.depth]++;
		assert.ok(count.shallow > count.reef, `${v}: shallow ${count.shallow} !> reef ${count.reef}`);
		assert.ok(count.reef > count.deep, `${v}: reef ${count.reef} !> deep ${count.deep}`);
		assert.ok(count.deep > count.abyss, `${v}: deep ${count.deep} !> abyss ${count.abyss}`);
		assert.ok(count.abyss > count.jackpot, `${v}: abyss ${count.abyss} !> jackpot ${count.jackpot}`);
	}
});
