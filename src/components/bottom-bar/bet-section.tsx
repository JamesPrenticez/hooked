import styled from "styled-components";

import { BetInput } from "@hooked-ui";
import { useBalanceStore } from "@stores/balanceStore";
import { CHIP_VALUES, useBetStore } from "@stores/betStore";
import { breakpoint } from "@utils/breakpoint";
import { formatMoney } from "@utils/formatMoney";

const Chip = styled(BetInput)`
	pointer-events: auto;
	height: auto;

	/* Full-width on a stacked portrait row; capped once the bar goes inline. */
	@media ${breakpoint.landscape}, ${breakpoint.tablet} {
		max-width: 20rem;
	}
`;

interface BetSectionProps {
	disabled: boolean;
}

/** Chip selector — the stake applied to the next depth/species tap in `SelectTargetsModal`. */
export const BetSection = ({ disabled }: BetSectionProps) => {
	const chip = useBetStore(s => s.chip);
	const setChip = useBetStore(s => s.setChip);
	const currency = useBalanceStore(s => s.currency) ?? "USD";

	return (
		<Chip
			label="Bet"
			orientation="vertical"
			value={chip}
			increments={CHIP_VALUES}
			format={(cents: number) => formatMoney(cents, currency)}
			disabled={disabled}
			onValueChange={setChip}
			quickSelect
			fullWidth
		/>
	);
};
