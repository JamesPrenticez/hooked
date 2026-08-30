// In-memory session store. Wiped on server restart — dev only (§16).
// A session is scoped to one player + game + currency, which is why
// /api/game/* requests never name the game (§35).

import { randomUUID } from "node:crypto";

import { config } from "./config.ts";

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
