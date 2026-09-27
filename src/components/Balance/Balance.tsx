import styled from "styled-components";

import { useAnimatedNumber } from "@hooks/useAnimatedNumber";
import { useBalanceStore } from "@stores/balanceStore";
import { breakpoint } from "@utils/breakpoint";

const Container = styled.div`
	/* Last in the portrait column, first in the row from landscape up (never-give-up). */
	order: 1;
	display: flex;
	flex-direction: column;
	gap: var(--spacing-xs);
	color: var(--color-white);
	pointer-events: none;
	user-select: none;

	@media ${breakpoint.landscape} {
		order: -1;
	}
`;

const Label = styled.span`
	font: var(--font-display-xxs);
	color: var(--color-primary-accent);
	letter-spacing: 0.08em;
`;

const Amount = styled.span`
	font: var(--font-display-sm);
	/* Keeps digit columns from jittering as the number eases. */
	font-variant-numeric: tabular-nums;
`;

// ponytail: locale pinned to en-US — swap for the operator/launch locale once
// the session carries one (milestone 26). Only affects grouping/symbol
// placement, never the amount.
const LOCALE = "en-US";

/**
 * Displays the server-authoritative balance (ARCHITECTURE §14). Reads the
 * figure from balanceStore — which only ever holds what the server last
 * reported — and eases the displayed number on every change. Renders
 * nothing until the first balance arrives.
 *
 * Lives inside BottomBar (HTML, never a child of <Application>, §38).
 */
export function Balance() {
	const balance = useBalanceStore(s => s.balance);
	const currency = useBalanceStore(s => s.currency);

	// Number() here is display-only — the wire/authoritative value stays a
	// decimal string and is never arithmetic'd on the client (Rule 6b).
	const displayed = useAnimatedNumber(balance === null ? 0 : Number(balance));

	if (balance === null || currency === null) return null;

	return (
		<Container>
			<Label>Balance</Label>
			<Amount>{new Intl.NumberFormat(LOCALE, { style: "currency", currency }).format(displayed)}</Amount>
		</Container>
	);
}
