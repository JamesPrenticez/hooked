// Authenticated game endpoints (§5, §8, §9, §14). POST /api/game/play is the
// single envelope for every game action — start opens a round (debits the
// stake, rolls the market and the catch now), complete settles it (credits
// the payout). See docs/BUILD_PLAN.md milestone 1 for the error-code table.

import { config } from "../config.ts";
import { VOLATILITIES } from "../constants.ts";
import { HttpError, route } from "../http.ts";
import { toCents } from "../money.ts";
import { hashSeed } from "../rng.ts";
import {
	getOpenRound,
	getRound,
	hasOpenRound,
	listCompleted,
	openRound,
	rollRound,
	type Round,
	settleRound,
	type Volatility
} from "../rounds.ts";
import { adjustBalance, requireSession } from "../sessions.ts";

const MIN_BET_CENTS = toCents(config.minBet);
const MAX_BET_CENTS = toCents(config.maxBet);

const isVolatility = (value: unknown): value is Volatility => VOLATILITIES.includes(value as Volatility);

function validateStart(start: { stake?: unknown; volatility?: unknown }) {
	const cents = typeof start.stake === "string" ? toCents(start.stake) : NaN;
	if (!(cents > 0)) {
		throw new HttpError(400, "invalid_bet", `Invalid stake: ${String(start.stake)}`);
	}
	if (cents < MIN_BET_CENTS || cents > MAX_BET_CENTS) {
		throw new HttpError(
			400,
			"invalid_bet",
			`Stake ${start.stake} is outside the ${config.minBet}–${config.maxBet} limit`
		);
	}
	if (!isVolatility(start.volatility)) {
		throw new HttpError(400, "invalid_bet", `Unknown volatility: ${String(start.volatility)}`);
	}
	return { stake: start.stake as string, volatility: start.volatility };
}

/** metadata.balance is always "0" on /game/play responses — not authoritative (§14). */
function toRoundResult(round: Round) {
	return {
		roundId: round.roundId,
		volatility: round.volatility,
		stake: round.stake,
		market: round.market,
		outcome: round.outcome,
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
	if (!open)
		return {
			balance: session.balance,
			currency: session.currency,
			active: false
		};
	// Market/outcome/payout withheld here (§30) — client calls GET /api/game/round/{id} to resume.
	return {
		balance: session.balance,
		currency: session.currency,
		active: true,
		roundId: open.roundId,
		stake: open.stake,
		volatility: open.volatility
	};
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
		const { stake, volatility } = validateStart(message.start as { stake?: unknown; volatility?: unknown });
		const wagered = toCents(stake);
		if (wagered > toCents(session.balance)) {
			throw new HttpError(400, "insufficient_balance", "Stake exceeds available balance");
		}
		// Open the round first, then debit — adjustBalance is pure arithmetic and
		// can't throw, so the stake is never taken without a round to back it.
		const round = openRound(session.playerId, stake, volatility);
		adjustBalance(session, -wagered);
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
		volatility: round.volatility,
		stake: round.stake,
		market: round.market,
		outcome: round.outcome,
		payout: round.payout,
		seed: round.seed
	};
});

// Provably-fair check (§36): recompute a round from a seed triple. Stateless
// — the caller supplies the revealed serverSeed (from POST /api/seed/reveal)
// plus the clientSeed/nonce/volatility recorded with the round, and compares
// the returned market and outcome to what that round paid out. Forced rounds
// won't match by design.
route("POST", "/api/game/verify", ctx => {
	requireSession(ctx);
	const body = (ctx.body ?? {}) as {
		serverSeed?: unknown;
		clientSeed?: unknown;
		nonce?: unknown;
		volatility?: unknown;
	};
	if (
		typeof body.serverSeed !== "string" ||
		typeof body.clientSeed !== "string" ||
		typeof body.nonce !== "number" ||
		!Number.isInteger(body.nonce) ||
		body.nonce < 0 ||
		!isVolatility(body.volatility)
	) {
		throw new HttpError(
			400,
			"invalid_verify_request",
			"serverSeed and clientSeed must be strings, nonce a non-negative integer and volatility low, medium or high"
		);
	}
	return {
		serverSeedHash: hashSeed(body.serverSeed),
		clientSeed: body.clientSeed,
		nonce: body.nonce,
		volatility: body.volatility,
		...rollRound(body.serverSeed, body.clientSeed, body.nonce, body.volatility)
	};
});

route("GET", "/api/game/history", ctx => {
	const session = requireSession(ctx);
	const rounds = listCompleted(session.playerId).map(r => ({
		roundId: r.roundId,
		volatility: r.volatility,
		stake: r.stake,
		outcome: r.outcome,
		payout: r.payout,
		seed: r.seed,
		completedAt: new Date(r.completedAt ?? r.createdAt).toISOString()
	}));
	return { rounds };
});
