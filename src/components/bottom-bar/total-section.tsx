import styled from "styled-components";

import { ExtractionMultiplier } from "@components/extraction-multiplier";
import { useLandingMultiplier } from "@hooks/useLandingMultiplier";
import { useBalanceStore } from "@stores/balanceStore";
import { useBetStore } from "@stores/betStore";
import { useHookStore } from "@stores/hookStore";
import { useRoundStore } from "@stores/roundStore";
import { formatMoney } from "@utils/formatMoney";

const Corner = styled.div`
	position: absolute;
	top: var(--spacing-md);
	left: var(--spacing-md);
	display: flex;
	align-items: center;
	gap: var(--spacing-sm);
	pointer-events: none;
`;

const Total = styled.div`
	display: flex;
	flex-direction: column;
	gap: 0.2rem;
	padding: var(--spacing-sm) 1.4rem;
	border-radius: var(--border-radius-md);
	background: color-mix(in srgb, var(--color-black) 55%, transparent);
	color: var(--color-white);
	pointer-events: none;
	user-select: none;
`;

const TotalLabel = styled.span`
	font: var(--font-display-xxs);
	color: var(--color-primary-accent);
`;

const TotalAmount = styled.span`
	font: var(--font-display-sm);
	font-variant-numeric: tabular-nums;
`;

/**
 * The stake for the next cast, pinned top-left. Once the fish is hooked and being landed it becomes the round's
 * payout — the figure the server credits — counting up as the multiplier climbs.
 */
export const TotalSection = () => {
	const total = useBetStore(s => s.chip);
	const currency = useBalanceStore(s => s.currency) ?? "USD";
	const landing = useLandingMultiplier();
	const landingPhase = useHookStore(
		s => s.sim?.phase === "ascend" || s.sim?.phase === "extract" || s.sim?.phase === "reel"
	);
	const simMultiplier = useHookStore(s => s.sim?.multiplier || 1);
	const serverPayout = useRoundStore(s => s.round?.payout.total);

	// The server's payout, revealed in step with the climb. Number() is display-only (Rule 6b).
	const payoutCents = serverPayout === undefined ? total : Math.round(Number(serverPayout) * 100);
	const payout = payoutCents * ((landing?.value ?? 0) / simMultiplier);

	return (
		<Corner>
			<Total>
				<TotalLabel>{landingPhase ? "Payout" : "Total bet"}</TotalLabel>
				<TotalAmount>{formatMoney(landingPhase ? payout : total, currency)}</TotalAmount>
			</Total>
			<ExtractionMultiplier />
		</Corner>
	);
};
