// Authenticated game endpoints (§5, §8, §9, §14). POST /api/game/play is the
// single envelope for every game action — start opens a round (debits the
// wager, generates the outcome now), complete settles it (credits the
// payout). See docs/BUILD_PLAN.md milestone 1 for the error-code table.

import { config } from "../config.ts";
import { FISH_IDS } from "../constants.ts";
import { HttpError, route } from "../http.ts";
import { toCents } from "../money.ts";
import { hashSeed } from "../rng.ts";
import {
	type Bet,
	type DepthId,
	getOpenRound,
	getRound,
	hasOpenRound,
	listCompleted,
	openRound,
	rollOutcome,
	type Round,
	settleRound
} from "../rounds.ts";
import { adjustBalance, requireSession } from "../sessions.ts";

const DEPTH_IDS: DepthId[] = ["shallow", "reef", "deep", "abyss", "trench"];

const MIN_BET_CENTS = toCents(config.minBet);
const MAX_BET_CENTS = toCents(config.maxBet);

function validateBets(bets: unknown): Bet[] {
	if (!Array.isArray(bets) || bets.length === 0) {
		throw new HttpError(400, "invalid_bet", "bets must be a non-empty array");
	}
	return bets.map(b => {
		const bet = b as Partial<Bet>;
		if (bet.type !== "depth" && bet.type !== "fish") {
			throw new HttpError(400, "invalid_bet", `Unknown bet type: ${String(bet.type)}`);
		}
		const cents = typeof bet.amount === "string" ? toCents(bet.amount) : NaN;
		if (!(cents > 0)) {
			throw new HttpError(400, "invalid_bet", `Invalid bet amount: ${String(bet.amount)}`);
		}
		if (cents < MIN_BET_CENTS || cents > MAX_BET_CENTS) {
			throw new HttpError(
				400,
				"invalid_bet",
				`Bet amount ${bet.amount} is outside the ${config.minBet}–${config.maxBet} limit`
			);
		}
		if (bet.type === "depth" && !DEPTH_IDS.includes(bet.selection as DepthId)) {
			throw new HttpError(400, "invalid_bet", `Unknown depth selection: ${String(bet.selection)}`);
		}
		if (bet.type === "fish" && !FISH_IDS.has(bet.selection as string)) {
			throw new HttpError(400, "invalid_bet", `Unknown fish selection: ${String(bet.selection)}`);
		}
		return { type: bet.type, selection: bet.selection as string, amount: bet.amount as string };
	});
}

/** metadata.balance is always "0" on /game/play responses — not authoritative (§14). */
function toRoundResult(round: Round) {
	return {
		roundId: round.roundId,
		outcome: round.outcome,
		bets: round.betResults,
		payout: round.payout,
		metadata: { balance: "0" }
	};
}

route("GET", "/api/game/balance", ctx => {
	const session = requireSession(ctx);
	return { balance: session.balance, currency: session.currency };
});

route("POST", "/api/game/current", ctx => {
	const session = requireSession(ctx);
	const open = getOpenRound(session.playerId);
	if (!open) return { balance: session.balance, currency: session.currency, active: false };
	// Outcome/payout withheld here (§30) — client calls GET /api/game/round/{id} to resume.
	return { balance: session.balance, currency: session.currency, active: true, roundId: open.roundId, bets: open.bets };
});

route("POST", "/api/game/play", ctx => {
	const session = requireSession(ctx);
	const message = (ctx.body as { message?: Record<string, unknown> } | undefined)?.message;
	const isStart = !!message && "start" in message;
	const isComplete = !!message && "complete" in message;
	if (isStart === isComplete) {
		throw new HttpError(400, "invalid_message", "message must contain exactly one of start|complete");
	}

	if (isStart) {
		if (hasOpenRound(session.playerId)) {
			throw new HttpError(409, "round_already_started", "A round is already open for this session");
		}
		const bets = validateBets((message.start as { bets?: unknown }).bets);
		const wagered = bets.reduce((sum, b) => sum + toCents(b.amount), 0);
		if (wagered > toCents(session.balance)) {
			throw new HttpError(400, "insufficient_balance", "Total wager exceeds available balance");
		}
		adjustBalance(session, -wagered);
		const round = openRound(session.playerId, bets);
		return { message: toRoundResult(round), roundId: round.roundId };
	}

	const roundId = (message.complete as { roundId?: unknown }).roundId;
	const round = typeof roundId === "string" ? getRound(roundId) : undefined;
	if (!round || round.playerId !== session.playerId) {
		throw new HttpError(404, "round_not_found", "No such round for this session");
	}
	if (round.status === "completed") {
		throw new HttpError(409, "round_already_completed", "Round has already been completed");
	}
	adjustBalance(session, toCents(round.payout.total));
	settleRound(round);
	return { message: toRoundResult(round), roundId: round.roundId };
});

route("GET", "/api/game/round/:id", ctx => {
	const session = requireSession(ctx);
	const round = getRound(ctx.params.id);
	if (!round || round.playerId !== session.playerId) {
		throw new HttpError(404, "round_not_found", "No such round for this session");
	}
	return {
		roundId: round.roundId,
		status: round.status,
		outcome: round.outcome,
		bets: round.betResults,
		payout: round.payout,
		seed: round.seed
	};
});

// Provably-fair check (§36): recompute an outcome from a seed triple. Stateless
// — the caller supplies the revealed serverSeed (from POST /api/seed/reveal)
// plus the clientSeed/nonce recorded with the round, and compares the returned
// outcome to what that round paid out. Forced rounds won't match by design.
route("POST", "/api/game/verify", ctx => {
	requireSession(ctx);
	const body = (ctx.body ?? {}) as { serverSeed?: unknown; clientSeed?: unknown; nonce?: unknown };
	if (
		typeof body.serverSeed !== "string" ||
		typeof body.clientSeed !== "string" ||
		typeof body.nonce !== "number" ||
		!Number.isInteger(body.nonce) ||
		body.nonce < 0
	) {
		throw new HttpError(
			400,
			"invalid_verify_request",
			"serverSeed and clientSeed must be strings and nonce a non-negative integer"
		);
	}
	return {
		serverSeedHash: hashSeed(body.serverSeed),
		clientSeed: body.clientSeed,
		nonce: body.nonce,
		outcome: rollOutcome(body.serverSeed, body.clientSeed, body.nonce)
	};
});

route("GET", "/api/game/history", ctx => {
	const session = requireSession(ctx);
	const rounds = listCompleted(session.playerId).map(r => ({
		roundId: r.roundId,
		outcome: r.outcome,
		bets: r.betResults,
		payout: r.payout,
		seed: r.seed,
		completedAt: new Date(r.completedAt ?? r.createdAt).toISOString()
	}));
	return { rounds };
});
