// Run: pnpm test:server  (node --test, no framework)
//
// HTTP-level tests for the provably-fair seed endpoints and POST /api/game/verify.
// Uses its own port to stay clear of game.test.ts / debug.test.ts when the
// test runner runs files concurrently (POST /api/session self-fetches
// config.port, so it just has to be listening in this process).

import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { after, before, test } from "node:test";

import { config } from "../config.ts";
import { handle } from "../http.ts";
import { hashSeed } from "../rng.ts";

import "../routes/operator.ts";
import "../routes/session.ts";
import "../routes/game.ts";
import "../routes/seed.ts";

// Imports hoist, so this runs before any handler reads config.port at request time.
config.port = 3021;
const base = `http://127.0.0.1:${config.port}`;
let server: Server;

before(
	() =>
		new Promise<void>(resolve => {
			server = createServer(handle);
			server.listen(config.port, resolve);
		})
);

after(() => new Promise<void>(resolve => server.close(() => resolve())));

interface Call {
	status: number;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	json: any;
}

async function call(method: string, path: string, opts: { token?: string; body?: unknown } = {}): Promise<Call> {
	const headers: Record<string, string> = {};
	if (opts.token) headers.authorization = `Bearer ${opts.token}`;
	if (opts.body !== undefined) headers["content-type"] = "application/json";
	const res = await fetch(`${base}${path}`, {
		method,
		headers,
		body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined
	});
	return { status: res.status, json: await res.json() };
}

async function newSession(): Promise<string> {
	const { json } = await call("POST", "/api/session");
	return json.sessionToken as string;
}

const startBody = (bets: unknown[]) => ({ message: { start: { bets } } });
const completeBody = (roundId: string) => ({ message: { complete: { roundId } } });
const fishBet = (selection: string, amount: string) => ({ type: "fish", selection, amount });

test("current exposes the hashed server seed, a client seed and nonce 0", async () => {
	const token = await newSession();
	const { status, json } = await call("POST", "/api/seed/current", { token });
	assert.equal(status, 200);
	assert.match(json.serverSeedHash, /^[0-9a-f]{64}$/);
	assert.ok(typeof json.clientSeed === "string" && json.clientSeed.length > 0);
	assert.equal(json.nonce, 0);
});

test("upcoming is a different commitment from the active server seed", async () => {
	const token = await newSession();
	const current = (await call("POST", "/api/seed/current", { token })).json;
	const upcoming = (await call("POST", "/api/seed/upcoming", { token })).json;
	assert.match(upcoming.serverSeedHash, /^[0-9a-f]{64}$/);
	assert.notEqual(upcoming.serverSeedHash, current.serverSeedHash);
});

test("each round consumes the next nonce and records the seed context", async () => {
	const token = await newSession();

	const r1 = (await call("POST", "/api/game/play", { token, body: startBody([fishBet("shark", "1.00")]) })).json;
	await call("POST", "/api/game/play", { token, body: completeBody(r1.roundId) });
	const detail1 = (await call("GET", `/api/game/round/${r1.roundId}`, { token })).json;
	assert.equal(detail1.seed.nonce, 0);
	assert.match(detail1.seed.serverSeedHash, /^[0-9a-f]{64}$/);

	const r2 = (await call("POST", "/api/game/play", { token, body: startBody([fishBet("shark", "1.00")]) })).json;
	await call("POST", "/api/game/play", { token, body: completeBody(r2.roundId) });
	const detail2 = (await call("GET", `/api/game/round/${r2.roundId}`, { token })).json;
	assert.equal(detail2.seed.nonce, 1);
	assert.equal(detail2.seed.serverSeedHash, detail1.seed.serverSeedHash);
});

test("reveal 404s until a server seed has been rotated away", async () => {
	const token = await newSession();
	const before = await call("POST", "/api/seed/reveal", { token });
	assert.equal(before.status, 404);
	assert.equal(before.json.error.code, "nothing_to_reveal");
});

test("rotate reveals the old seed (hash matches), pre-commit becomes active, nonce resets", async () => {
	const token = await newSession();
	const current = (await call("POST", "/api/seed/current", { token })).json;
	const upcoming = (await call("POST", "/api/seed/upcoming", { token })).json;

	const rotated = await call("POST", "/api/seed/rotate", { token, body: { clientSeed: "my-lucky-seed" } });
	assert.equal(rotated.status, 200);
	assert.equal(rotated.json.clientSeed, "my-lucky-seed");
	assert.equal(rotated.json.nonce, 0);
	assert.equal(rotated.json.serverSeedHash, upcoming.serverSeedHash);

	const revealed = (await call("POST", "/api/seed/reveal", { token })).json;
	assert.equal(revealed.serverSeedHash, current.serverSeedHash);
	assert.equal(hashSeed(revealed.serverSeed), current.serverSeedHash);
	assert.equal(revealed.clientSeed, current.clientSeed);
});

test("rotate is blocked while a round is open", async () => {
	const token = await newSession();
	const round = (await call("POST", "/api/game/play", { token, body: startBody([fishBet("shark", "1.00")]) })).json;

	const blocked = await call("POST", "/api/seed/rotate", { token });
	assert.equal(blocked.status, 409);
	assert.equal(blocked.json.error.code, "round_in_progress");

	await call("POST", "/api/game/play", { token, body: completeBody(round.roundId) });
	assert.equal((await call("POST", "/api/seed/rotate", { token })).status, 200);
});

test("verify re-derives a past round's outcome from its revealed seed triple", async () => {
	const token = await newSession();

	const round = (await call("POST", "/api/game/play", { token, body: startBody([fishBet("shark", "1.00")]) })).json;
	await call("POST", "/api/game/play", { token, body: completeBody(round.roundId) });
	const detail = (await call("GET", `/api/game/round/${round.roundId}`, { token })).json;

	// Rotate so the server seed for that round becomes public.
	await call("POST", "/api/seed/rotate", { token });
	const revealed = (await call("POST", "/api/seed/reveal", { token })).json;

	const verified = await call("POST", "/api/game/verify", {
		token,
		body: { serverSeed: revealed.serverSeed, clientSeed: detail.seed.clientSeed, nonce: detail.seed.nonce }
	});
	assert.equal(verified.status, 200);
	assert.equal(verified.json.serverSeedHash, detail.seed.serverSeedHash);
	assert.deepEqual(verified.json.outcome, detail.outcome);
});

test("verify rejects a malformed seed triple", async () => {
	const token = await newSession();
	const bad = await call("POST", "/api/game/verify", {
		token,
		body: { serverSeed: "abc", clientSeed: "x", nonce: -1 }
	});
	assert.equal(bad.status, 400);
	assert.equal(bad.json.error.code, "invalid_verify_request");
});
