import { zoneForDepth } from "@constants/depthZones";

import styles from "./DepthIndicator.module.css";

interface DepthIndicatorProps {
	depth: number;
}

const FORMAT = new Intl.NumberFormat("en-US");

/**
 * HTML overlay: current descent depth + zone name, shown only while
 * descending (App.tsx). A sibling of <Application>, never a child of it
 * (§38) — same pattern as Balance.
 */
function DepthIndicator({ depth }: DepthIndicatorProps) {
	const zone = zoneForDepth(depth);

	return (
		<div className={styles.indicator}>
			<span className={styles.zone}>{zone.label}</span>
			<span className={styles.meters}>{FORMAT.format(Math.round(depth))}m</span>
		</div>
	);
}

export default DepthIndicator;
