import { DEPTH_ZONES } from "@constants/depthZones";
import { FISH } from "@constants/fish";
import { useBalanceStore } from "@stores/balanceStore";
import { betKey, type BetType, useBetStore } from "@stores/betStore";
import { formatMoney } from "@utils/formatMoney";

import styles from "./BettingBoard.module.css";

interface BettingBoardProps {
	/** Locks every tile — bets can't change once a round is under way. */
	disabled?: boolean;
}

/**
 * "Choose your bets": one tile per depth zone plus a scrollable species row
 * (mobile-reference.webp). Tapping a tile bets it at the current chip; tapping
 * again removes it. A depth and a fish can both be live (GDD).
 */
function BettingBoard({ disabled = false }: BettingBoardProps) {
	const bets = useBetStore(s => s.bets);
	const toggle = useBetStore(s => s.toggle);
	const currency = useBalanceStore(s => s.currency) ?? "USD";

	const tile = (type: BetType, selection: string, name: string, className: string, label = name) => {
		const stake = bets[betKey(type, selection)];
		return (
			<button
				key={selection}
				type="button"
				className={className}
				data-depth={type === "depth" ? selection : undefined}
				aria-pressed={stake !== undefined}
				aria-label={label}
				disabled={disabled}
				onClick={() => toggle(type, selection)}
			>
				<span className={styles.name}>{name}</span>
				{stake !== undefined && <span className={styles.stake}>{formatMoney(stake, currency)}</span>}
			</button>
		);
	};

	return (
		<section className={styles.board} aria-label="Choose your bets">
			<h2 className={styles.title}>Choose your bets</h2>
			<div className={styles.depths}>
				{DEPTH_ZONES.filter(zone => zone.id !== "trench").map(zone => tile("depth", zone.id, zone.label, styles.depth))}
			</div>
			<div className={styles.speciesHeader}>
				Species <span className={styles.optional}>(optional)</span>
			</div>
			<div className={styles.species}>
				{FISH.map(fish => tile("fish", fish.id, fish.name, styles.fish, `${fish.name} (${fish.depth})`))}
			</div>
		</section>
	);
}

export default BettingBoard;
