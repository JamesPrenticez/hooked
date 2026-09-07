// Run: pnpm test:server  (node --test, no framework)
//
// HTTP-level tests for the /api/debug/* development controls. Uses its own
// port (POST /api/session self-fetches config.port for the operator launch,
// so the value just has to be listening in this process) to stay clear of
// game.test.ts, which binds the default port.

import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { after, before, test } from "node:test";

import { config } from "../config.ts";
import { handle } from "../http.ts";

import "../routes/operator.ts";
import "../routes/session.ts";
import "../routes/game.ts";
import "../routes/debug.ts";

// Imports hoist, so this runs before any handler reads config.port at request time.
config.port = 3011;
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
	return json.sessionToken;
}

const startBody = (bets: unknown[]) => ({ message: { start: { bets } } });

test("force-outcome pins depth/fish/tier on the next round, and {} clears it", async () => {
	const token = await newSession();

	const forced = await call("POST", "/api/debug/force-outcome", {
		body: { depth: "trench", fish: "kraken", tier: "jackpot" }
	});
	assert.equal(forced.status, 200);
	assert.deepEqual(forced.json.forcedOutcome, { depth: "trench", fish: "kraken", tier: "jackpot" });

	const start = await call("POST", "/api/game/play", {
		token,
		body: startBody([{ type: "fish", selection: "kraken", amount: "1.00" }])
	});
	assert.deepEqual(start.json.message.outcome, { depth: "trench", fish: "kraken", tier: "jackpot" });
	assert.equal(start.json.message.bets[0].won, true);

	const cleared = await call("POST", "/api/debug/force-outcome", { body: {} });
	assert.deepEqual(cleared.json.forcedOutcome, {});
});

test("force-outcome can pin a single field and leave the rest rolled", async () => {
	const token = await newSession();
	await call("POST", "/api/debug/force-outcome", { body: { depth: "abyss" } });

	for (let i = 0; i < 5; i++) {
		const start = await call("POST", "/api/game/play", {
			token,
			body: startBody([{ type: "depth", selection: "abyss", amount: "1.00" }])
		});
		assert.equal(start.json.message.outcome.depth, "abyss");
		await call("POST", "/api/game/play", { token, body: { message: { complete: { roundId: start.json.roundId } } } });
	}
	await call("POST", "/api/debug/force-outcome", { body: {} });
});

test("force-outcome rejects unknown depth/tier", async () => {
	const bad = await call("POST", "/api/debug/force-outcome", { body: { depth: "moon" } });
	assert.equal(bad.status, 400);
	assert.equal(bad.json.error.code, "invalid_debug_request");

	const badTier = await call("POST", "/api/debug/force-outcome", { body: { tier: "mythic" } });
	assert.equal(badTier.status, 400);
});

test("reset-balance restores the starting balance, or a supplied one", async () => {
	const token = await newSession();
	await call("POST", "/api/game/play", {
		token,
		body: startBody([{ type: "depth", selection: "shallow", amount: "100.00" }])
	});
	assert.equal((await call("GET", "/api/game/balance", { token })).json.balance, "900.00");

	await call("POST", "/api/debug/reset-balance");
	assert.equal((await call("GET", "/api/game/balance", { token })).json.balance, "1000.00");

	await call("POST", "/api/debug/reset-balance", { body: { balance: "250.00" } });
	assert.equal((await call("GET", "/api/game/balance", { token })).json.balance, "250.00");

	const bad = await call("POST", "/api/debug/reset-balance", { body: { balance: "-5" } });
	assert.equal(bad.status, 400);

	await call("POST", "/api/debug/reset-balance");
});

test("simulate injects latency, then can be turned back off", async () => {
	const token = await newSession();
	const armed = await call("POST", "/api/debug/simulate", { body: { latencyMs: 120 } });
	assert.equal(armed.json.simulation.latencyMs, 120);

	const t0 = Date.now();
	await call("GET", "/api/game/balance", { token });
	assert.ok(Date.now() - t0 >= 100, "request should have been delayed");

	await call("POST", "/api/debug/simulate", { body: { latencyMs: 0 } });
	const t1 = Date.now();
	await call("GET", "/api/game/balance", { token });
	assert.ok(Date.now() - t1 < 100, "delay should be gone");
});

test("simulate errorRate 1 fails other routes but not the debug routes themselves", async () => {
	const token = await newSession();
	await call("POST", "/api/debug/simulate", { body: { errorRate: 1 } });

	const failed = await call("GET", "/api/game/balance", { token });
	assert.equal(failed.status, 500);
	assert.equal(failed.json.error.code, "simulated_error");

	// The escape hatch: /api/debug/* is exempt, so this still works.
	const off = await call("POST", "/api/debug/simulate", { body: { errorRate: 0 } });
	assert.equal(off.status, 200);

	assert.equal((await call("GET", "/api/game/balance", { token })).status, 200);

	const bad = await call("POST", "/api/debug/simulate", { body: { errorRate: 2 } });
	assert.equal(bad.status, 400);
});

test("reset-session kills every token", async () => {
	const token = await newSession();
	assert.equal((await call("GET", "/api/game/balance", { token })).status, 200);

	const reset = await call("POST", "/api/debug/reset-session");
	assert.equal(reset.status, 200);

	const dead = await call("GET", "/api/game/balance", { token });
	assert.equal(dead.status, 401);
	assert.equal(dead.json.error.code, "invalid_session");
});
