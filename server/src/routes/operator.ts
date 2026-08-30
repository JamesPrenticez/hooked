// POST /operator/launch — the operator side of the launch handshake (§35).
// The mock server calls this on itself over real HTTP when a client asks for a
// session. Production replaces this with the real operator/RGS endpoint.

import { HttpError, route } from "../http.ts";
import { verifyHeaders } from "../operator-auth.ts";

route("POST", "/operator/launch", async ({ req, body }) => {
	// http.ts already consumed the stream to parse `body`; re-serialise the same
	// object for signature verification. Deterministic for the shapes we send.
	const raw = JSON.stringify(body);
	if (!verifyHeaders(req.headers, raw)) {
		throw new HttpError(401, "invalid_operator_signature", "Operator HMAC verification failed");
	}
	const { playerId } = (body ?? {}) as { playerId?: string };
	if (!playerId) throw new HttpError(400, "invalid_launch", "playerId is required");

	return { playerId, launched: true };
});
