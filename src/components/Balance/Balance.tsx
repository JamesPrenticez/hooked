import { useAnimatedNumber } from "@/hooks/useAnimatedNumber";
import { useBalanceStore } from "@/stores/balanceStore";

import styles from "./Balance.module.css";

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
 * HTML overlay: a sibling of <Application>, never a child of it (§38).
 */
function Balance() {
	const balance = useBalanceStore(s => s.balance);
	const currency = useBalanceStore(s => s.currency);

	// Number() here is display-only — the wire/authoritative value stays a
	// decimal string and is never arithmetic'd on the client (Rule 6b).
	const displayed = useAnimatedNumber(balance === null ? 0 : Number(balance));

	if (balance === null || currency === null) return null;

	return (
		<div className={styles.balance}>
			<span className={styles.label}>Balance</span>
			<span className={styles.amount}>
				{new Intl.NumberFormat(LOCALE, { style: "currency", currency }).format(displayed)}
			</span>
		</div>
	);
}

export default Balance;
