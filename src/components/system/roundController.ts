// Drives a round against the server: cast opens it (debiting the stake and
// dealing the fish market), landing settles it (crediting the payout). The
// balance shown is always what the server reports afterwards — the client never
// adjusts it itself (balanceStore).

import { completeRound, getBalance, startRound } from "@api";
import { useBalanceStore } from "@stores/balanceStore";
import { toWireStart, useBetStore } from "@stores/betStore";
import { useRoundStore } from "@stores/roundStore";

import { setInflightRoundId } from "./roundRecovery";

async function syncBalance() {
	const { balance, currency } = await getBalance();
	useBalanceStore.getState().setBalance(balance, currency);
}

/** Opens a round at the composed stake and volatility and refreshes the balance. Throws (ApiError) if the server refuses it. */
export async function openRound(): Promise<void> {
	const round = await startRound(toWireStart(useBetStore.getState()));
	setInflightRoundId(round.roundId);
	useRoundStore.getState().setRound({ ...round, status: "open" });
	await syncBalance();
}

/** Settles the open round, if any, and refreshes the balance with the payout paid in. */
export async function closeRound(): Promise<void> {
	const open = useRoundStore.getState().round;
	if (open?.status !== "open") return;
	const round = await completeRound(open.roundId);
	useRoundStore.getState().setRound({ ...round, status: "completed" });
	await syncBalance();
	setInflightRoundId(null);
}
