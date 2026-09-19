import BettingBoard from "@components/BettingBoard";
import { BetInput, Button } from "@hooked-ui";
import { useBalanceStore } from "@stores/balanceStore";
import { CHIP_VALUES, selectTotalCents, useBetStore } from "@stores/betStore";
import { formatMoney } from "@utils/formatMoney";

import styles from "./BottomBar.module.css";

interface BottomBarProps {
	descending: boolean;
	onCast: () => void;
}

/**
 * Mobile-first bottom UI (reference: `src/assets/reference/mobile-reference.webp`):
 * chip selector, cast-line control, total wager, and the betting board.
 * Autoplay, last catch and the nav strip are the rest of BUILD_PLAN §8 and
 * aren't built yet.
 *
 * Cast toggles the client-only descent view (App.tsx) — bets aren't submitted
 * to the server yet, and the board locks while descending.
 */
function BottomBar({ descending, onCast }: BottomBarProps) {
	const chip = useBetStore(s => s.chip);
	const setChip = useBetStore(s => s.setChip);
	const clear = useBetStore(s => s.clear);
	const total = useBetStore(selectTotalCents);
	const currency = useBalanceStore(s => s.currency) ?? "USD";
	const money = (cents: number) => formatMoney(cents, currency);

	return (
		<div className={styles.bar}>
			<div className={styles.controls}>
				<BetInput
					className={styles.chip}
					label="Chip"
					orientation="vertical"
					value={chip}
					increments={CHIP_VALUES}
					format={money}
					disabled={descending}
					onValueChange={setChip}
					fullWidth
				/>
				<button type="button" className={styles.castButton} aria-pressed={descending} onClick={onCast}>
					<svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
						<circle cx="12" cy="5" r="2.5" strokeWidth="2" />
						<line x1="12" y1="7.5" x2="12" y2="21" strokeWidth="2" />
						<path d="M8 11h8" strokeWidth="2" strokeLinecap="round" />
						<path d="M4.5 13a7.5 7.5 0 0 0 15 0" strokeWidth="2" strokeLinecap="round" />
					</svg>
					<span>{descending ? "Surface" : "Cast Line"}</span>
				</button>
				<div className={styles.total}>
					<span className={styles.totalLabel}>Total bet</span>
					<span className={styles.totalAmount}>{money(total)}</span>
					<Button variant="flat" disabled={descending || total === 0} onClick={clear}>
						Clear
					</Button>
				</div>
			</div>
			<BettingBoard disabled={descending} />
		</div>
	);
}

export default BottomBar;
