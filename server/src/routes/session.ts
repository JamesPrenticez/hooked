// POST /api/session — unauthenticated (§35). Performs a real HMAC-signed HTTP
// round-trip to POST /operator/launch, then mints a session token bound to a
// fresh development wallet.

import { config } from "../config.ts";
import { HttpError, route } from "../http.ts";
import { signHeaders } from "../operator-auth.ts";
import { createSession } from "../sessions.ts";

let playerCounter = 0;

route("POST", "/api/session", async () => {
	const playerId = `dev-player-${++playerCounter}`;
	const launchBody = JSON.stringify({ playerId });

	const launch = await fetch(`http://127.0.0.1:${config.port}/operator/launch`, {
		method: "POST",
		headers: { "content-type": "application/json", ...signHeaders(launchBody) },
		body: launchBody
	});
	if (!launch.ok) {
		throw new HttpError(502, "operator_launch_failed", `Operator launch returned ${launch.status}`);
	}

	const session = createSession(playerId);
	return {
		sessionToken: session.sessionToken,
		playerId: session.playerId,
		currency: session.currency,
		balance: session.balance
	};
});
