import styled from "styled-components";

import { ExtractionMultiplier } from "@components/extraction-multiplier";
import { useLandingMultiplier } from "@hooks/useLandingMultiplier";
import { useBalanceStore } from "@stores/balanceStore";
import { selectTotalCents, useBetStore } from "@stores/betStore";
import { useHookStore } from "@stores/hookStore";
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
 * Sum of every depth/species stake placed in `SelectTargetsModal`, pinned top-left. Once the fish is hooked and
 * being landed it becomes the payout: the stake times the climbing multiplier.
 */
export const TotalSection = () => {
	const total = useBetStore(selectTotalCents);
	const currency = useBalanceStore(s => s.currency) ?? "USD";
	const landing = useLandingMultiplier();
	const landingPhase = useHookStore(s => s.sim?.phase === "ascend" || s.sim?.phase === "extract");

	return (
		<Corner>
			<Total>
				<TotalLabel>{landingPhase ? "Payout" : "Total bet"}</TotalLabel>
				<TotalAmount>{formatMoney(landingPhase ? total * (landing?.value ?? 0) : total, currency)}</TotalAmount>
			</Total>
			<ExtractionMultiplier />
		</Corner>
	);
};
