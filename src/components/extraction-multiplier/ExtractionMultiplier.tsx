import styled, { keyframes } from "styled-components";

import { useLandingMultiplier } from "@hooks/useLandingMultiplier";
import { formatMultiplier } from "@utils/formatMultiplier";

const pop = keyframes`
	from {
		transform: scale(1.5);
	}
	to {
		transform: scale(1);
	}
`;

const Readout = styled.span`
	color: var(--color-primary);
	font: var(--font-display-lg);
	text-shadow: 0 0.2rem 0 var(--color-negative);
	font-variant-numeric: tabular-nums;
	user-select: none;
`;

/* Re-keyed on the gear, so it slams in again each time a bigger one takes over. */
const Value = styled.span`
	display: inline-block;
	animation: ${pop} 0.35s ease-out;
`;

/**
 * The multiplier climbing while a catch is landed: it ticks up as the fish comes out, sticks while a gear strains
 * against it and jumps as the next takes over. Off the sim's clock, like `HookedBanner`. Sits beside the payout panel (`TotalSection`).
 */
export function ExtractionMultiplier() {
	const landing = useLandingMultiplier();
	if (!landing) return null;

	return (
		<Readout role="status" aria-label="Catch multiplier">
			<Value key={landing.stage}>×{formatMultiplier(landing.value)}</Value>
		</Readout>
	);
}
