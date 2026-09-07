// /api/debug/* — development controls (§16, §17). Unauthenticated by design
// (ARCHITECTURE.md §8): the client gates them behind VITE_DEBUG instead, and
// this whole module is only imported when config.debugControls is true, so the
// routes don't exist in production at all.
//
// Covers: force outcome (depth/fish/tier — "Force Kraken" is just
// { depth: "trench", fish: "kraken", tier: "jackpot" } from the toolbar),
// reset balance, reset session, and simulated latency/errors. Deterministic
// seeded outcomes are the provably-fair RNG instead — see server/src/rng.ts
// and the /api/seed/* endpoints.

import { config } from "../config.ts";
import { getDebugState, resetDebugState, setForcedOutcome, setSimulation } from "../debug-state.ts";
import { HttpError, route } from "../http.ts";
import { toCents } from "../money.ts";
import { resetRounds } from "../rounds.ts";
import { resetSeeds } from "../seeds.ts";
import { resetBalances, resetSessions } from "../sessions.ts";

const DEPTHS = ["shallow", "reef", "deep", "abyss", "trench"];
const TIERS = ["small", "large", "epic", "legendary", "jackpot"];

function optEnum(value: unknown, allowed: string[], field: string): string | undefined {
	if (value == null) return undefined;
	if (typeof value !== "string" || !allowed.includes(value)) {
		throw new HttpError(400, "invalid_debug_request", `${field} must be one of: ${allowed.join(", ")}`);
	}
	return value;
}

function optNumber(value: unknown, field: string, min = 0): number | undefined {
	if (value == null) return undefined;
	if (typeof value !== "number" || !Number.isFinite(value) || value < min) {
		throw new HttpError(400, "invalid_debug_request", `${field} must be a number >= ${min}`);
	}
	return value;
}

function optString(value: unknown, field: string): string | undefined {
	if (value == null) return undefined;
	if (typeof value !== "string" || value.length === 0) {
		throw new HttpError(400, "invalid_debug_request", `${field} must be a non-empty string`);
	}
	return value;
}

// Not registered at all in production — the routes 404 like any other unknown path.
if (config.debugControls) {
	route("GET", "/api/debug/state", () => getDebugState());

	// Body: { depth?, fish?, tier? }. Omit a field to leave it rolled; {} clears all.
	route("POST", "/api/debug/force-outcome", ctx => {
		const body = (ctx.body ?? {}) as { depth?: unknown; fish?: unknown; tier?: unknown };
		setForcedOutcome({
			depth: optEnum(body.depth, DEPTHS, "depth"),
			fish: optString(body.fish, "fish"),
			tier: optEnum(body.tier, TIERS, "tier")
		});
		return getDebugState();
	});

	// Body: { latencyMs?, errorRate? } — only the provided fields change.
	route("POST", "/api/debug/simulate", ctx => {
		const body = (ctx.body ?? {}) as { latencyMs?: unknown; errorRate?: unknown };
		const errorRate = optNumber(body.errorRate, "errorRate");
		if (errorRate !== undefined && errorRate > 1) {
			throw new HttpError(400, "invalid_debug_request", "errorRate must be between 0 and 1");
		}
		setSimulation({ latencyMs: optNumber(body.latencyMs, "latencyMs"), errorRate });
		return getDebugState();
	});

	// Body: { balance? } decimal string — defaults to the configured starting balance.
	route("POST", "/api/debug/reset-balance", ctx => {
		const balance = (ctx.body as { balance?: unknown } | undefined)?.balance;
		if (balance != null && (typeof balance !== "string" || !(toCents(balance) >= 0))) {
			throw new HttpError(400, "invalid_debug_request", "balance must be a non-negative decimal string");
		}
		resetBalances(balance as string | undefined);
		return { ok: true };
	});

	// Drops every session + round + debug override. The client's token dies and it re-launches.
	route("POST", "/api/debug/reset-session", () => {
		resetSessions();
		resetRounds();
		resetSeeds();
		resetDebugState();
		return { ok: true };
	});
}
