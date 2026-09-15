import styles from "./BottomBar.module.css";

interface BottomBarProps {
	descending: boolean;
	onCast: () => void;
}

/**
 * Mobile-first bottom UI (reference: `src/assets/reference/mobile/mobile-reference.webp`)
 * — for now just the cast-line control. Bet tiles, species row, autoplay and
 * the total-wager readout are the rest of BUILD_PLAN §8 and aren't built yet.
 *
 * Toggles the client-only descent view (App.tsx) — no bets, no server round,
 * just the visual dive/surface for now.
 */
function BottomBar({ descending, onCast }: BottomBarProps) {
	return (
		<div className={styles.bar}>
			<button type="button" className={styles.castButton} aria-pressed={descending} onClick={onCast}>
				<svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
					<circle cx="12" cy="5" r="2.5" strokeWidth="2" />
					<line x1="12" y1="7.5" x2="12" y2="21" strokeWidth="2" />
					<path d="M8 11h8" strokeWidth="2" strokeLinecap="round" />
					<path d="M4.5 13a7.5 7.5 0 0 0 15 0" strokeWidth="2" strokeLinecap="round" />
				</svg>
				<span>{descending ? "Surface" : "Cast Line"}</span>
			</button>
		</div>
	);
}

export default BottomBar;
