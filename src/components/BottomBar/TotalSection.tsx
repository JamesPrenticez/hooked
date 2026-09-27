import styled from "styled-components";

import { Button } from "@hooked-ui";
import { useBalanceStore } from "@stores/balanceStore";
import { selectTotalCents, useBetStore } from "@stores/betStore";
import { formatMoney } from "@utils/formatMoney";

const Total = styled.div`
	pointer-events: auto;
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: var(--spacing-xs);
	color: var(--color-white);
	text-align: right;
`;

const TotalLabel = styled.span`
	font: var(--font-display-xxs);
	color: var(--color-primary-accent);
`;

const TotalAmount = styled.span`
	font: var(--font-display-sm);
	font-variant-numeric: tabular-nums;
`;

interface TotalSectionProps {
	disabled: boolean;
}

/** Sum of every depth/species stake placed in `SelectTargetsModal`, plus the control to wipe them. */
export function TotalSection({ disabled }: TotalSectionProps) {
	const clear = useBetStore(s => s.clear);
	const total = useBetStore(selectTotalCents);
	const currency = useBalanceStore(s => s.currency) ?? "USD";

	return (
		<Total>
			<TotalLabel>Total bet</TotalLabel>
			<TotalAmount>{formatMoney(total, currency)}</TotalAmount>
			<Button variant="flat" disabled={disabled || total === 0} onClick={clear}>
				Clear
			</Button>
		</Total>
	);
}
