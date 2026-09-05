// Run: pnpm test:server  (node --test, no framework)

import assert from "node:assert/strict";
import { test } from "node:test";

import { fromCents, toCents } from "./money.ts";

test("round-trips whole and fractional amounts", () => {
	assert.equal(toCents("1000.00"), 100000);
	assert.equal(fromCents(100000), "1000.00");
	assert.equal(toCents("0.05"), 5);
	assert.equal(fromCents(5), "0.05");
});

test("pads a single decimal digit", () => {
	assert.equal(toCents("1.5"), 150);
});

test("accepts a bare integer", () => {
	assert.equal(toCents("42"), 4200);
});

test("rejects malformed amounts", () => {
	assert.ok(Number.isNaN(toCents("abc")));
	assert.ok(Number.isNaN(toCents("-5")));
	assert.ok(Number.isNaN(toCents("5.555")));
	assert.ok(Number.isNaN(toCents("")));
});

test("fromCents rounds and formats a negative", () => {
	assert.equal(fromCents(100.4), "1.00");
	assert.equal(fromCents(-150), "-1.50");
});
