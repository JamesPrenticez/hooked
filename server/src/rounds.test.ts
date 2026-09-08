// Run: pnpm test:server  (node --test, no framework)
//
// Pure unit tests for outcome generation (BUILD_PLAN 3.1). No HTTP, no state —
// rollOutcome is deterministic in its seed triple. The heavy RTP / frequency
// simulation is milestone 3.5; this proves the hierarchy holds and the weighted
// roll reaches every branch.

import assert from "node:assert/strict";
import { test } from "node:test";

import { FISH } from "./constants.ts";
import { rollOutcome } from "./rounds.ts";

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
	const count: Record<string, number> = { shallow: 0, reef: 0, deep: 0, abyss: 0, trench: 0 };
	for (let nonce = 0; nonce < 6000; nonce++) count[rollOutcome("ordering", "check", nonce).depth]++;
	assert.ok(count.shallow > count.reef, `shallow ${count.shallow} !> reef ${count.reef}`);
	assert.ok(count.reef > count.deep, `reef ${count.reef} !> deep ${count.deep}`);
	assert.ok(count.deep > count.abyss, `deep ${count.deep} !> abyss ${count.abyss}`);
	assert.ok(count.abyss > count.trench, `abyss ${count.abyss} !> trench ${count.trench}`);
});
