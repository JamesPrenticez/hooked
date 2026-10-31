// Boot / reconnect reconciliation (ARCHITECTURE §30, BUILD_PLAN §4.4). Sits
// beside StoreSync as the other half of the "no store imports @api" rule (§7,
// §39): StoreSync handles the reactive onSessionExpired effect, this handles the
// one-shot "pull authoritative state and make the stores match it" that the
// Loading Screen (milestone 5) runs after initSession() and on every reconnect.

import { getCurrent, getRound } from "@api";
import { useBalanceStore } from "@stores/balanceStore";
import { type RoundSnapshot, useRoundStore } from "@stores/roundStore";
import type { CurrentResponse, RoundDetailResponse } from "@type/api";

// The roundId the client is currently presenting, persisted so a reload can
// still find a round the server has already settled (§4.4 "Recover completed
// round" — getCurrent() only reports rounds that are still open). Written by the
// betting controller when it opens a round (milestone 8), cleared once the
// payout presentation finishes.
const INFLIGHT_KEY = "deepcatch.roundId";

function readInflightRoundId(): string | null {
	try {
		return localStorage.getItem(INFLIGHT_KEY);
	} catch {
		return null;
	}
}

export function setInflightRoundId(roundId: string | null) {
	try {
		if (roundId) localStorage.setItem(INFLIGHT_KEY, roundId);
		else localStorage.removeItem(INFLIGHT_KEY);
	} catch {
		// Storage disabled (private mode): a mid-payout reload can't be
		// recovered, but getCurrent() still recovers any still-open round.
	}
}

function toSnapshot(detail: RoundDetailResponse): RoundSnapshot {
	return {
		roundId: detail.roundId,
		status: detail.status,
		stake: detail.stake,
		volatility: detail.volatility,
		market: detail.market,
		bonus: detail.bonus,
		outcome: detail.outcome,
		payout: detail.payout
	};
}

/**
 * Reconcile the client stores with authoritative server state — on boot after
 * initSession(), and after any reconnect (§30). Never assumes the last request
 * "probably worked": the server's answer is the only truth.
 *
 * Pass the CurrentResponse from initSession() to reuse its /game/current
 * round-trip on boot; omit it on a bare reconnect and this fetches its own.
 */
export async function recoverFromServer(current?: CurrentResponse): Promise<void> {
	const state = current ?? (await getCurrent());
	useBalanceStore.getState().setBalance(state.balance, state.currency);

	// Server still has an open round → pull full detail and resume from it. The
	// snapshot's status ("open") tells the presentation to play the sequence
	// out; a "completed" one tells it to jump to payout (§18 interrupted
	// animation).
	if (state.active && state.roundId) {
		const detail = await getRound(state.roundId);
		setInflightRoundId(detail.roundId);
		useRoundStore.getState().setRound(toSnapshot(detail));
		return;
	}

	// No open round, but we persisted one we were presenting → it settled while
	// we were away, or we reloaded mid-payout. Pull it so the client shows the
	// result instead of silently dropping a win.
	const inflight = readInflightRoundId();
	if (inflight) {
		const detail = await getRound(inflight).catch(() => null);
		if (detail?.status === "completed") {
			useRoundStore.getState().setRound(toSnapshot(detail));
			return;
		}
	}

	setInflightRoundId(null);
	useRoundStore.getState().clearRound();
}
