// In-memory session store. Wiped on server restart — dev only (§16).
// A session is scoped to one player + game + currency, which is why
// /api/game/* requests never name the game (§35).

import { randomUUID } from "node:crypto";

import { config } from "./config.ts";
import { type Ctx, HttpError } from "./http.ts";
import { fromCents, toCents } from "./money.ts";

export interface Session {
	sessionToken: string;
	playerId: string;
	currency: string;
	/** Authoritative balance as a decimal string (§5). */
	balance: string;
}

const byToken = new Map<string, Session>();

export function createSession(playerId: string): Session {
	const session: Session = {
		sessionToken: randomUUID(),
		playerId,
		currency: config.currency,
		balance: config.startingBalance
	};
	byToken.set(session.sessionToken, session);
	return session;
}

export function getSession(token: string | undefined): Session | undefined {
	return token ? byToken.get(token) : undefined;
}

/** Bearer-token gate for /api/game/*, /api/seed/* and /api/session/refresh (§8). */
export function requireSession(ctx: Ctx): Session {
	const auth = ctx.req.headers.authorization;
	const token = typeof auth === "string" && auth.startsWith("Bearer ") ? auth.slice(7) : undefined;
	const session = getSession(token);
	if (!session) throw new HttpError(401, "invalid_session", "Missing or invalid session token");
	return session;
}

/**
 * Rotates a session's token (§35: "each token refreshes at most once"). The
 * old token is deleted immediately — it doesn't get a grace period, it's
 * just dead — so a second refresh (or any other call) with it 401s via the
 * normal invalid_session path.
 */
export function rotateToken(session: Session): Session {
	byToken.delete(session.sessionToken);
	session.sessionToken = randomUUID();
	byToken.set(session.sessionToken, session);
	return session;
}

/** Applies a signed cents delta to the session's authoritative balance. */
export function adjustBalance(session: Session, deltaCents: number): void {
	session.balance = fromCents(toCents(session.balance) + deltaCents);
}

/**
 * Resets every live session's balance (§16 "reset player balance"). Dev has
 * effectively one player, so this doesn't need to name one. Defaults to the
 * configured starting balance.
 */
export function resetBalances(balance: string = config.startingBalance): void {
	for (const session of byToken.values()) session.balance = balance;
}

/**
 * Drops every session (§16 "reset session"). The client's current token goes
 * dead, so its next call 401s and it re-launches — the intended dev behaviour.
 */
export function resetSessions(): void {
	byToken.clear();
}
