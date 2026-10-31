// Run: pnpm test:server  (node --test, no framework)
//
// HTTP-level integration tests. Binds config.port for real (not an
// ephemeral port) because POST /api/session self-fetches that exact port
// (routes/session.ts) — can't run this alongside `pnpm server` on the same
// port; set SERVER_PORT to run it next to a dev server.

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
	return json as {
		sessionToken: string;
		playerId: string;
		currency: string;
		balance: string;
	};
}

const startBody = (stake: string, volatility: unknown = "medium") => ({ message: { start: { stake, volatility } } });
const completeBody = (roundId: string) => ({
	message: { complete: { roundId } }
});
const forceOutcome = (body: Record<string, string>) => call("POST", "/api/debug/force-outcome", { body });

/** Cents a stake pays at a market price — the test's own arithmetic, not the server's. */
const payCents = (stake: string, multiplier: string) => Math.round(Number(stake) * Number(multiplier) * 100);
const money = (cents: number) => (cents / 100).toFixed(2);

test("start debits the stake, complete credits the payout, and both surface in round detail + history", async () => {
	const session = await newSession();

	// Pin the catch so the round is a deterministic happy path that doesn't depend on the roll landing on our fish.
	await forceOutcome({ fish: "shark" });
	const start = await call("POST", "/api/game/play", {
		token: session.sessionToken,
		body: startBody("10.00", "high")
	});
	assert.equal(start.status, 200);
	const roundId = start.json.roundId;
	const { message } = start.json;
	assert.equal(message.roundId, roundId);
	assert.equal(message.volatility, "high");
	assert.equal(message.stake, "10.00");
	assert.equal(message.outcome.fish, "shark");
	// The catch pays the price the market lists for it, and the payout is the stake times that price.
	const sharkPrice = message.market.find((e: { fish: string }) => e.fish === "shark").multiplier;
	assert.equal(message.outcome.multiplier, sharkPrice);
	assert.equal(message.payout.wagered, "10.00");
	assert.equal(message.payout.total, money(payCents("10.00", sharkPrice)));
	assert.equal(message.payout.net, money(payCents("10.00", sharkPrice) - 1000));
	assert.equal(message.metadata.balance, "0"); // not authoritative (§14)

	const afterStart = await call("GET", "/api/game/balance", { token: session.sessionToken });
	assert.equal(afterStart.json.balance, "990.00");

	const complete = await call("POST", "/api/game/play", {
		token: session.sessionToken,
		body: completeBody(roundId)
	});
	assert.equal(complete.status, 200);
	assert.equal(complete.json.message.payout.total, message.payout.total);

	const afterComplete = await call("GET", "/api/game/balance", { token: session.sessionToken });
	assert.equal(afterComplete.json.balance, money(99000 + payCents("10.00", sharkPrice)));

	const detail = await call("GET", `/api/game/round/${roundId}`, { token: session.sessionToken });
	assert.equal(detail.status, 200);
	assert.equal(detail.json.status, "completed");
	assert.deepEqual(detail.json.market, message.market);
	assert.deepEqual(detail.json.outcome, message.outcome);
	assert.equal(detail.json.volatility, "high");
	assert.equal(detail.json.stake, "10.00");

	const history = await call("GET", "/api/game/history", { token: session.sessionToken });
	assert.equal(history.status, 200);
	assert.ok(history.json.rounds.some((r: { roundId: string }) => r.roundId === roundId));

	await forceOutcome({}); // clear the pin for the rest of the file
});

test("the Kraken pays its fixed price so the jackpot is exact", async () => {
	const session = await newSession();
	await forceOutcome({ fish: "kraken" });
	const start = await call("POST", "/api/game/play", {
		token: session.sessionToken,
		body: startBody("1.00", "medium")
	});
	assert.equal(start.json.message.outcome.multiplier, "100.00");
	assert.equal(start.json.message.payout.total, "100.00");
	assert.equal(start.json.message.payout.net, "99.00");
	await forceOutcome({});
});

test("a catch that pays less than the stake reports a negative net", async () => {
	const session = await newSession();
	await forceOutcome({ fish: "shrimp" }); // every shallow price is under 1× at medium
	const start = await call("POST", "/api/game/play", {
		token: session.sessionToken,
		body: startBody("5.00", "medium")
	});
	const { payout } = start.json.message;
	assert.ok(Number(payout.total) < 5, payout.total);
	assert.ok(payout.net.startsWith("-"), payout.net);
	assert.equal(payout.net, money(Math.round(Number(payout.total) * 100) - 500));
	await forceOutcome({});
});

test("a forced depth lands a fish from that zone, priced off the market", async () => {
	const session = await newSession();
	await forceOutcome({ depth: "abyss" });
	const start = await call("POST", "/api/game/play", {
		token: session.sessionToken,
		body: startBody("1.00", "low")
	});
	const { outcome, market } = start.json.message;
	assert.equal(outcome.depth, "abyss");
	assert.equal(outcome.multiplier, market.find((e: { fish: string }) => e.fish === outcome.fish).multiplier);
	await forceOutcome({});
});

test("round_already_started — starting a second round before completing the first", async () => {
	const session = await newSession();
	await call("POST", "/api/game/play", { token: session.sessionToken, body: startBody("5.00") });
	const second = await call("POST", "/api/game/play", { token: session.sessionToken, body: startBody("5.00", "low") });
	assert.equal(second.status, 409);
	assert.equal(second.json.error.code, "round_already_started");
});

test("round_already_completed — completing a round twice", async () => {
	const session = await newSession();
	const { json: start } = await call("POST", "/api/game/play", {
		token: session.sessionToken,
		body: startBody("5.00")
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

	const bogus = await call("POST", "/api/game/play", {
		token: a.sessionToken,
		body: completeBody("no-such-round")
	});
	assert.equal(bogus.status, 404);
	assert.equal(bogus.json.error.code, "round_not_found");

	const { json: startedByA } = await call("POST", "/api/game/play", {
		token: a.sessionToken,
		body: startBody("5.00")
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

test("insufficient_balance — stake exceeds available balance", async () => {
	const session = await newSession();
	await call("POST", "/api/debug/reset-balance", { body: { balance: "1.00" } });
	const res = await call("POST", "/api/game/play", {
		token: session.sessionToken,
		body: startBody("50.00") // within stake limits, over balance
	});
	assert.equal(res.status, 400);
	assert.equal(res.json.error.code, "insufficient_balance");
	await call("POST", "/api/debug/reset-balance", { body: {} }); // back to the default for later tests
});

test("invalid_bet — bad stake, bad volatility, stake limits", async () => {
	const session = await newSession();
	const cases: [string, unknown][] = [
		["", "medium"],
		["abc", "medium"],
		["5.999", "medium"],
		["-5.00", "medium"],
		["0.05", "medium"], // below minBet 0.10
		["999.00", "medium"], // above maxBet 500.00
		["5.00", "ludicrous"],
		["5.00", null],
		["5.00", 2]
	];
	for (const [stake, volatility] of cases) {
		const res = await call("POST", "/api/game/play", {
			token: session.sessionToken,
			body: startBody(stake, volatility)
		});
		assert.equal(res.status, 400, JSON.stringify([stake, volatility]));
		assert.equal(res.json.error.code, "invalid_bet", JSON.stringify([stake, volatility]));
	}

	// A stake that isn't a string at all, a start with no volatility, and a start with nothing in it.
	for (const start of [{ stake: 5, volatility: "medium" }, { stake: "5.00" }, {}]) {
		const res = await call("POST", "/api/game/play", { token: session.sessionToken, body: { message: { start } } });
		assert.equal(res.status, 400);
		assert.equal(res.json.error.code, "invalid_bet");
	}
});

test("invalid_message — message must contain exactly one of start|complete", async () => {
	const session = await newSession();
	const neither = await call("POST", "/api/game/play", {
		token: session.sessionToken,
		body: { message: {} }
	});
	assert.equal(neither.status, 400);
	assert.equal(neither.json.error.code, "invalid_message");

	const both = await call("POST", "/api/game/play", {
		token: session.sessionToken,
		body: { message: { start: { stake: "1.00", volatility: "low" }, complete: { roundId: "x" } } }
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
	const refreshed = await call("POST", "/api/session/refresh", {
		token: session.sessionToken
	});
	assert.equal(refreshed.status, 200);
	const newToken = refreshed.json.sessionToken;
	assert.notEqual(newToken, session.sessionToken);

	const withOld = await call("GET", "/api/game/balance", {
		token: session.sessionToken
	});
	assert.equal(withOld.status, 401);

	const withNew = await call("GET", "/api/game/balance", { token: newToken });
	assert.equal(withNew.status, 200);

	const refreshOldAgain = await call("POST", "/api/session/refresh", {
		token: session.sessionToken
	});
	assert.equal(refreshOldAgain.status, 401);
});

test("current reflects an open round (stake and volatility only, no outcome), then clears after complete", async () => {
	const session = await newSession();
	const before_ = await call("POST", "/api/game/current", {
		token: session.sessionToken
	});
	assert.equal(before_.json.active, false);

	const { json: start } = await call("POST", "/api/game/play", {
		token: session.sessionToken,
		body: startBody("5.00", "high")
	});
	const duringOpen = await call("POST", "/api/game/current", {
		token: session.sessionToken
	});
	assert.equal(duringOpen.json.active, true);
	assert.equal(duringOpen.json.roundId, start.roundId);
	assert.equal(duringOpen.json.stake, "5.00");
	assert.equal(duringOpen.json.volatility, "high");
	assert.equal(duringOpen.json.outcome, undefined); // withheld per §30 — fetch via getRound() instead
	assert.equal(duringOpen.json.market, undefined);

	await call("POST", "/api/game/play", {
		token: session.sessionToken,
		body: completeBody(start.roundId)
	});
	const afterComplete = await call("POST", "/api/game/current", {
		token: session.sessionToken
	});
	assert.equal(afterComplete.json.active, false);
});
