import { DEPTH_DISPLAY_STEP, formatDepth, zoneForDepth } from "@constants/depthZones";
import { useDebugStore } from "@stores/debugStore";

import styles from "./DepthIndicator.module.css";

interface DepthIndicatorProps {
	depth: number;
}

/**
 * HTML overlay: current descent depth + zone name, shown only while
 * descending (App.tsx). A sibling of <Application>, never a child of it
 * (§38) — same pattern as Balance.
 */
function DepthIndicator({ depth }: DepthIndicatorProps) {
	const depthZones = useDebugStore(state => state.depthZones);
	const depthUnit = useDebugStore(state => state.depthUnit);
	const zone = zoneForDepth(depth, depthZones);

	return (
		<div className={styles.indicator}>
			<span className={styles.zone}>{zone.label}</span>
			<span className={styles.meters}>{formatDepth(depth, depthUnit, DEPTH_DISPLAY_STEP)}</span>
		</div>
	);
}

export default DepthIndicator;
