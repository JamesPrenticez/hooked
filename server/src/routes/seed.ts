// Provably-fair seed endpoints (§36). All bearer-gated like /api/game/*.
//
//   current   active client seed + hashed server seed + nonce
//   upcoming  hash of the next server seed (committed now, active after rotate)
//   rotate    reveal the old server seed, switch to the next one, reset nonce
//   reveal    the most recently rotated-away pair, server seed disclosed
//
// rotate is blocked while a round is open — the outcome for that round's
// nonce must stay tied to the seed it was rolled from.

import { HttpError, route } from "../http.ts";
import { hasOpenRound } from "../rounds.ts";
import { currentSeed, revealSeed, rotateSeed, upcomingSeed } from "../seeds.ts";
import { requireSession } from "../sessions.ts";

route("POST", "/api/seed/current", ctx => currentSeed(requireSession(ctx).playerId));

route("POST", "/api/seed/upcoming", ctx => upcomingSeed(requireSession(ctx).playerId));

route("POST", "/api/seed/rotate", ctx => {
	const session = requireSession(ctx);
	if (hasOpenRound(session.playerId)) {
		throw new HttpError(409, "round_in_progress", "Cannot rotate seeds while a round is open");
	}
	const clientSeed = (ctx.body as { clientSeed?: unknown } | undefined)?.clientSeed;
	if (
		clientSeed !== undefined &&
		(typeof clientSeed !== "string" || clientSeed.length === 0 || clientSeed.length > 256)
	) {
		throw new HttpError(400, "invalid_seed_request", "clientSeed must be a non-empty string (max 256 chars)");
	}
	return rotateSeed(session.playerId, clientSeed as string | undefined);
});

route("POST", "/api/seed/reveal", ctx => {
	const revealed = revealSeed(requireSession(ctx).playerId);
	if (!revealed) throw new HttpError(404, "nothing_to_reveal", "No server seed has been rotated away yet");
	return revealed;
});
