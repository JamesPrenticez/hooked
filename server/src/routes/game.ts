// Authenticated read endpoints needed for the foundation handshake (§5).
// Round play (start/complete) arrives in a later milestone.

import { type Ctx, HttpError, route } from "../http.ts";
import { getSession, type Session } from "../sessions.ts";

/** Bearer-token gate for /api/game/* (§8). Returns the resolved session. */
function requireSession(ctx: Ctx): Session {
	const auth = ctx.req.headers["authorization"];
	const token = typeof auth === "string" && auth.startsWith("Bearer ") ? auth.slice(7) : undefined;
	const session = getSession(token);
	if (!session) throw new HttpError(401, "invalid_session", "Missing or invalid session token");
	return session;
}

route("GET", "/api/game/balance", ctx => {
	const session = requireSession(ctx);
	return { balance: session.balance, currency: session.currency };
});

route("POST", "/api/game/current", ctx => {
	const session = requireSession(ctx);
	// No round persistence yet — nothing is ever resumable at this milestone (§30).
	return { balance: session.balance, currency: session.currency, active: false };
});
