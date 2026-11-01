import styled, { keyframes } from "styled-components";

import { useLandingMultiplier } from "@hooks/useLandingMultiplier";
import { useLandingPayout } from "@hooks/useLandingPayout";
import { useBalanceStore } from "@stores/balanceStore";
import { formatMoney } from "@utils/formatMoney";
import { formatMultiplier } from "@utils/formatMultiplier";
import { CHINOOK_FROM, CRANE_FROM, HELICOPTER_FROM, MAX_MULTIPLIER } from "@utils/simExtraction";

const pop = keyframes`
	from {
		transform: scale(1.5);
	}
	to {
		transform: scale(1);
	}
`;

/** The depth zone whose colour the multiplier wears: it climbs gold to jackpot as the catch gets bigger. */
function zoneColor(multiplier: number) {
	if (multiplier >= MAX_MULTIPLIER) return "var(--color-depth-jackpot)";
	if (multiplier >= CHINOOK_FROM) return "var(--color-depth-abyss)";
	if (multiplier >= HELICOPTER_FROM) return "var(--color-depth-deep)";
	if (multiplier >= CRANE_FROM) return "var(--color-depth-reef)";
	return "var(--color-primary)";
}

const Centre = styled.div`
	position: absolute;
	inset: 0 0 auto;
	height: 33.333%;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing-md);
	pointer-events: none;
	user-select: none;
`;

const Readout = styled.span<{ $color: string }>`
	color: ${({ $color }) => $color};
	transition: color 0.3s;
	font: var(--font-display-xxxxl);
	text-shadow: 0 0.4rem 0 var(--color-black);
	font-variant-numeric: tabular-nums;
`;

const Payout = styled.span`
	color: var(--color-white);
	font: var(--font-display-xxl);
	text-shadow: 0 0.3rem 0 var(--color-black);
	font-variant-numeric: tabular-nums;
`;

/* Re-keyed on the gear, so it slams in again each time a bigger one takes over. */
const Value = styled.span`
	display: inline-block;
	animation: ${pop} 0.35s ease-out;
`;

/**
 * The multiplier and payout climbing in the top third of the screen while a catch is landed: they tick up as the fish
 * comes out, stick while a gear strains against it and jump as the next takes over. The multiplier takes the colour of
 * the depth zone its size belongs to. Off the sim's clock, like `HookedBanner`.
 */
export function ExtractionMultiplier() {
	const landing = useLandingMultiplier();
	const payout = useLandingPayout();
	const currency = useBalanceStore(s => s.currency) ?? "USD";
	if (!landing) return null;

	return (
		<Centre role="status" aria-label="Catch multiplier">
			<Readout $color={zoneColor(landing.value)}>
				<Value key={landing.stage}>×{formatMultiplier(landing.value)}</Value>
			</Readout>
			<Payout>{formatMoney(payout, currency)}</Payout>
		</Centre>
	);
}
