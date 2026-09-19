// Run: pnpm test:server  (node --test, no framework)
//
// HTTP-level integration tests. Binds config.port for real (not an
// ephemeral port) because POST /api/session self-fetches that exact port
// (routes/session.ts) — can't run this alongside `pnpm server` on the same
// port.

import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { after, before, test } from "node:test";

import { config } from "../config.ts";
import { handle } from "../http.ts";

import "../routes/operator.ts";
import "../routes/session.ts";
import "../routes/game.ts";
import "../routes/debug.ts";

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

async function newSession() {
	const { json } = await call("POST", "/api/session");
	return json as { sessionToken: string; playerId: string; currency: string; balance: string };
}

const depthBet = (selection: string, amount: string) => ({ type: "depth", selection, amount });
const fishBet = (selection: string, amount: string) => ({ type: "fish", selection, amount });
const startBody = (bets: unknown[]) => ({ message: { start: { bets } } });
const completeBody = (roundId: string) => ({ message: { complete: { roundId } } });
const forceOutcome = (body: Record<string, string>) => call("POST", "/api/debug/force-outcome", { body });

test("start debits the wager, complete credits the payout, and both surface in round detail + history", async () => {
	const session = await newSession();

	// Pin the outcome so a fish bet on it is a guaranteed win — a deterministic
	// happy path that doesn't depend on the weighted roll landing on our fish.
	await forceOutcome({ fish: "shark" });
	const start = await call("POST", "/api/game/play", {
		token: session.sessionToken,
		body: startBody([fishBet("shark", "10.00")])
	});
	assert.equal(start.status, 200);
	const roundId = start.json.roundId;
	assert.equal(start.json.message.roundId, roundId);
	assert.equal(start.json.message.payout.wagered, "10.00");
	assert.equal(start.json.message.payout.total, "310.60"); // shark ×31.06 (server/src/constants.ts)
	assert.equal(start.json.message.payout.net, "300.60"); // 310.60 − 10.00
	assert.equal(start.json.message.bets[0].won, true);
	assert.equal(start.json.message.metadata.balance, "0"); // not authoritative (§14)

	const afterStart = await call("GET", "/api/game/balance", { token: session.sessionToken });
	assert.equal(afterStart.json.balance, "990.00");

	const complete = await call("POST", "/api/game/play", { token: session.sessionToken, body: completeBody(roundId) });
	assert.equal(complete.status, 200);
	assert.equal(complete.json.message.payout.total, "310.60");

	const afterComplete = await call("GET", "/api/game/balance", { token: session.sessionToken });
	assert.equal(afterComplete.json.balance, "1300.60"); // 990.00 + 310.60

	const detail = await call("GET", `/api/game/round/${roundId}`, { token: session.sessionToken });
	assert.equal(detail.status, 200);
	assert.equal(detail.json.status, "completed");

	const history = await call("GET", "/api/game/history", { token: session.sessionToken });
	assert.equal(history.status, 200);
	assert.ok(history.json.rounds.some((r: { roundId: string }) => r.roundId === roundId));

	await forceOutcome({}); // clear the pin for the rest of the file
});

test("multiple simultaneous bets resolve independently against one outcome (BUILD_PLAN 3.3)", async () => {
	const session = await newSession();
	await forceOutcome({ depth: "deep", fish: "shark", tier: "epic" });

	// Three bets on one outcome: depth hit (deep ×5.65), fish hit (shark ×31.06),
	// fish miss (whale). Total = 56.50 + 310.60 + 0, wagered 30, net = 337.10.
	const start = await call("POST", "/api/game/play", {
		token: session.sessionToken,
		body: startBody([depthBet("deep", "10.00"), fishBet("shark", "10.00"), fishBet("whale", "10.00")])
	});
	assert.equal(start.status, 200);
	const [depthRes, sharkRes, whaleRes] = start.json.message.bets;
	assert.deepEqual([depthRes.won, sharkRes.won, whaleRes.won], [true, true, false]);
	assert.equal(depthRes.payout, "56.50");
	assert.equal(sharkRes.payout, "310.60");
	assert.equal(whaleRes.payout, "0.00");
	assert.equal(start.json.message.payout.total, "367.10");
	assert.equal(start.json.message.payout.wagered, "30.00");
	assert.equal(start.json.message.payout.net, "337.10");

	await forceOutcome({});
});

test("a losing round reports a negative net", async () => {
	const session = await newSession();
	await forceOutcome({ depth: "jackpot", fish: "kraken", tier: "jackpot" });
	const start = await call("POST", "/api/game/play", {
		token: session.sessionToken,
		body: startBody([depthBet("shallow", "5.00")])
	});
	assert.equal(start.json.message.bets[0].won, false);
	assert.equal(start.json.message.payout.total, "0.00");
	assert.equal(start.json.message.payout.net, "-5.00");
	await forceOutcome({});
});

test("round_already_started — starting a second round before completing the first", async () => {
	const session = await newSession();
	await call("POST", "/api/game/play", { token: session.sessionToken, body: startBody([depthBet("shallow", "5.00")]) });
	const second = await call("POST", "/api/game/play", {
		token: session.sessionToken,
		body: startBody([depthBet("reef", "5.00")])
	});
	assert.equal(second.status, 409);
	assert.equal(second.json.error.code, "round_already_started");
});

test("round_already_completed — completing a round twice", async () => {
	const session = await newSession();
	const { json: start } = await call("POST", "/api/game/play", {
		token: session.sessionToken,
		body: startBody([fishBet("shark", "5.00")])
	});
	const first = await call("POST", "/api/game/play", {
		token: session.sessionToken,
		body: completeBody(start.roundId)
	});
	assert.equal(first.status, 200);
	const second = await call("POST", "/api/game/play", {
		token: session.sessionToken,
		body: completeBody(start.roundId)
	});
	assert.equal(second.status, 409);
	assert.equal(second.json.error.code, "round_already_completed");
});

test("round_not_found — unknown id and another session's round", async () => {
	const a = await newSession();
	const b = await newSession();

	const bogus = await call("POST", "/api/game/play", { token: a.sessionToken, body: completeBody("no-such-round") });
	assert.equal(bogus.status, 404);
	assert.equal(bogus.json.error.code, "round_not_found");

	const { json: startedByA } = await call("POST", "/api/game/play", {
		token: a.sessionToken,
		body: startBody([fishBet("shark", "5.00")])
	});
	const foreignComplete = await call("POST", "/api/game/play", {
		token: b.sessionToken,
		body: completeBody(startedByA.roundId)
	});
	assert.equal(foreignComplete.status, 404);
	assert.equal(foreignComplete.json.error.code, "round_not_found");

	const foreignDetail = await call("GET", `/api/game/round/${startedByA.roundId}`, { token: b.sessionToken });
	assert.equal(foreignDetail.status, 404);
});

test("insufficient_balance — wager exceeds available balance", async () => {
	const session = await newSession();
	await call("POST", "/api/debug/reset-balance", { body: { balance: "1.00" } });
	const res = await call("POST", "/api/game/play", {
		token: session.sessionToken,
		body: startBody([depthBet("shallow", "50.00")]) // within stake limits, over balance
	});
	assert.equal(res.status, 400);
	assert.equal(res.json.error.code, "insufficient_balance");
	await call("POST", "/api/debug/reset-balance", { body: {} }); // back to the default for later tests
});

test("invalid_bet — empty bets, bad type, bad amount, unknown selections, stake limits", async () => {
	const session = await newSession();
	const cases = [
		[],
		[{ type: "coin-flip", selection: "shallow", amount: "5.00" }],
		[{ type: "depth", selection: "shallow", amount: "5.999" }],
		[{ type: "depth", selection: "moon", amount: "5.00" }],
		[{ type: "fish", selection: "", amount: "5.00" }],
		[{ type: "fish", selection: "mermaid", amount: "5.00" }], // not on the roster
		[{ type: "depth", selection: "shallow", amount: "0.05" }], // below minBet 0.10
		[{ type: "depth", selection: "shallow", amount: "999.00" }] // above maxBet 500.00
	];
	for (const bets of cases) {
		const res = await call("POST", "/api/game/play", { token: session.sessionToken, body: startBody(bets) });
		assert.equal(res.status, 400, JSON.stringify(bets));
		assert.equal(res.json.error.code, "invalid_bet", JSON.stringify(bets));
	}
});

test("invalid_message — message must contain exactly one of start|complete", async () => {
	const session = await newSession();
	const neither = await call("POST", "/api/game/play", { token: session.sessionToken, body: { message: {} } });
	assert.equal(neither.status, 400);
	assert.equal(neither.json.error.code, "invalid_message");

	const both = await call("POST", "/api/game/play", {
		token: session.sessionToken,
		body: { message: { start: { bets: [] }, complete: { roundId: "x" } } }
	});
	assert.equal(both.status, 400);
	assert.equal(both.json.error.code, "invalid_message");
});

test("invalid_session — 401 without a valid bearer token", async () => {
	const routes: [string, string][] = [
		["GET", "/api/game/balance"],
		["POST", "/api/game/current"],
		["POST", "/api/game/play"],
		["GET", "/api/game/round/whatever"],
		["GET", "/api/game/history"],
		["POST", "/api/session/refresh"]
	];
	for (const [method, path] of routes) {
		const res = await call(method, path);
		assert.equal(res.status, 401, `${method} ${path}`);
		assert.equal(res.json.error.code, "invalid_session", `${method} ${path}`);
	}
});

test("session/refresh rotates the token — old token dies, new token works", async () => {
	const session = await newSession();
	const refreshed = await call("POST", "/api/session/refresh", { token: session.sessionToken });
	assert.equal(refreshed.status, 200);
	const newToken = refreshed.json.sessionToken;
	assert.notEqual(newToken, session.sessionToken);

	const withOld = await call("GET", "/api/game/balance", { token: session.sessionToken });
	assert.equal(withOld.status, 401);

	const withNew = await call("GET", "/api/game/balance", { token: newToken });
	assert.equal(withNew.status, 200);

	const refreshOldAgain = await call("POST", "/api/session/refresh", { token: session.sessionToken });
	assert.equal(refreshOldAgain.status, 401);
});

test("current reflects an open round (bets only, no outcome), then clears after complete", async () => {
	const session = await newSession();
	const before_ = await call("POST", "/api/game/current", { token: session.sessionToken });
	assert.equal(before_.json.active, false);

	const { json: start } = await call("POST", "/api/game/play", {
		token: session.sessionToken,
		body: startBody([depthBet("shallow", "5.00")])
	});
	const duringOpen = await call("POST", "/api/game/current", { token: session.sessionToken });
	assert.equal(duringOpen.json.active, true);
	assert.equal(duringOpen.json.roundId, start.roundId);
	assert.deepEqual(duringOpen.json.bets, [{ type: "depth", selection: "shallow", amount: "5.00" }]);
	assert.equal(duringOpen.json.outcome, undefined); // withheld per §30 — fetch via getRound() instead

	await call("POST", "/api/game/play", { token: session.sessionToken, body: completeBody(start.roundId) });
	const afterComplete = await call("POST", "/api/game/current", { token: session.sessionToken });
	assert.equal(afterComplete.json.active, false);
});
