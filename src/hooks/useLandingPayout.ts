import { useLandingMultiplier } from "@hooks/useLandingMultiplier";
import { useBetStore } from "@stores/betStore";
import { useHookStore } from "@stores/hookStore";
import { useRoundStore } from "@stores/roundStore";

/** The round's payout in cents, revealed in step with the landing multiplier's climb. */
export function useLandingPayout(): number {
	const stake = useBetStore(s => s.chip);
	const landing = useLandingMultiplier();
	const simMultiplier = useHookStore(s => s.sim?.multiplier || 1);
	const serverPayout = useRoundStore(s => s.round?.payout.total);

	// The server's payout, revealed in step with the climb. Number() is display-only (Rule 6b).
	const payoutCents = serverPayout === undefined ? stake : Math.round(Number(serverPayout) * 100);
	return payoutCents * ((landing?.value ?? 0) / simMultiplier);
}
