// Run: pnpm test:server  (node --test, no framework)
//
// Pure unit tests for the provably-fair primitives — no HTTP, no state.

import assert from "node:assert/strict";
import { test } from "node:test";

import { byteStream, generateSeed, hashSeed, rollInt } from "./rng.ts";

const take = (gen: Generator<number>, n: number) => Array.from({ length: n }, () => gen.next().value);

test("hashSeed is SHA-256 hex (known vector)", () => {
	assert.equal(hashSeed(""), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
});

test("generateSeed is 64 hex chars and unique per call", () => {
	const a = generateSeed();
	const b = generateSeed();
	assert.match(a, /^[0-9a-f]{64}$/);
	assert.notEqual(a, b);
});

test("byteStream is deterministic in (serverSeed, clientSeed, nonce)", () => {
	const first = take(byteStream("server", "client", 0), 80);
	const again = take(byteStream("server", "client", 0), 80);
	assert.deepEqual(first, again);
	// >32 bytes proves block chaining works past one HMAC digest.
	assert.equal(first.length, 80);
	assert.ok(first.every(b => Number.isInteger(b) && b >= 0 && b <= 255));
});

test("byteStream diverges when any input changes", () => {
	const base = take(byteStream("server", "client", 0), 32).join(",");
	assert.notEqual(base, take(byteStream("server", "client", 1), 32).join(","));
	assert.notEqual(base, take(byteStream("server", "other", 0), 32).join(","));
	assert.notEqual(base, take(byteStream("other", "client", 0), 32).join(","));
});

test("rollInt stays in range and is reproducible from the same triple", () => {
	const rolls = Array.from({ length: 200 }, (_, i) => rollInt(byteStream("s", "c", i), 5));
	assert.ok(rolls.every(r => r >= 0 && r < 5));
	assert.equal(rollInt(byteStream("s", "c", 7), 5), rollInt(byteStream("s", "c", 7), 5));
});

test("rollInt covers the whole range without wild bias", () => {
	const counts = [0, 0, 0, 0, 0];
	for (let i = 0; i < 5000; i++) counts[rollInt(byteStream("bias", "check", i), 5)]++;
	// Uniform expectation is 1000 each; allow a generous ±40%.
	assert.ok(
		counts.every(c => c > 600 && c < 1400),
		`skewed distribution: ${counts.join(",")}`
	);
});

test("rollInt rejects a non-positive max", () => {
	assert.throws(() => rollInt(byteStream("s", "c", 0), 0), RangeError);
});
