import styled from "styled-components";

import { useLandingPayout } from "@hooks/useLandingPayout";
import { useBalanceStore } from "@stores/balanceStore";
import { useBetStore } from "@stores/betStore";
import { useHookStore } from "@stores/hookStore";
import { formatMoney } from "@utils/formatMoney";

const Total = styled.div`
	display: flex;
	flex-direction: column;
	gap: var(--spacing-xs);
	color: var(--color-white);
	pointer-events: none;
	user-select: none;
`;

const Label = styled.span`
	font: var(--font-display-xxs);
	color: var(--color-primary-accent);
	letter-spacing: 0.08em;
`;

const Amount = styled.span`
	font: var(--font-display-sm);
	font-variant-numeric: tabular-nums;
`;

/**
 * The stake for the next cast. Once the fish is hooked and being landed it becomes the round's
 * payout — the figure the server credits — counting up as the multiplier climbs.
 */
export const TotalBet = () => {
	const total = useBetStore(s => s.chip);
	const currency = useBalanceStore(s => s.currency) ?? "USD";
	const landingPhase = useHookStore(s => s.sim?.phase === "ascend" || s.sim?.phase === "extract");
	const payout = useLandingPayout();

	return (
		<Total>
			<Label>{landingPhase ? "Payout" : "Total bet"}</Label>
			<Amount>{formatMoney(landingPhase ? payout : total, currency)}</Amount>
		</Total>
	);
};
