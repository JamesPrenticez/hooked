// Run: pnpm test:server  (node --test, no framework)

import assert from "node:assert/strict";
import { test } from "node:test";

import { signHeaders, verifyHeaders } from "./operator-auth.ts";

test("signed headers verify against the same body", () => {
	const body = JSON.stringify({ playerId: "dev-player-1" });
	assert.equal(verifyHeaders(signHeaders(body), body), true);
});

test("verification fails when the body is tampered with", () => {
	const headers = signHeaders(JSON.stringify({ playerId: "dev-player-1" }));
	assert.equal(verifyHeaders(headers, JSON.stringify({ playerId: "dev-player-2" })), false);
});

test("verification fails with missing headers", () => {
	assert.equal(verifyHeaders({}, "{}"), false);
});
