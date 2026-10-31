import styled from "styled-components";

import { DEPTH_DISPLAY_STEP, formatDepth, zoneForDepth } from "@constants/depthZones";
import { useDebugStore } from "@stores/debugStore";

const Container = styled.div`
	position: absolute;
	top: 8.4rem; /* below the Total bet panel */
	left: var(--spacing-md);
	display: flex;
	flex-direction: column;
	gap: 0.2rem;
	padding: var(--spacing-sm) 1.4rem;
	border-radius: var(--border-radius-md);
	background: color-mix(in srgb, var(--color-black) 55%, transparent);
	color: var(--color-white);
	pointer-events: none;
	user-select: none;
`;

const Zone = styled.span`
	font: var(--font-display-xxs);
	color: var(--color-primary-accent);
	letter-spacing: 0.08em;
`;

const Meters = styled.span`
	font: var(--font-display-sm);
	font-variant-numeric: tabular-nums;
`;

interface DepthIndicatorProps {
	depth: number;
}

/**
 * HTML overlay: current descent depth + zone name, shown only while
 * descending (App.tsx). A sibling of <Application>, never a child of it
 * (§38) — same pattern as Balance.
 */
export function DepthIndicator({ depth }: DepthIndicatorProps) {
	const depthZones = useDebugStore(state => state.depthZones);
	const depthUnit = useDebugStore(state => state.depthUnit);
	const zone = zoneForDepth(depth, depthZones);

	return (
		<Container>
			<Zone>{zone.label}</Zone>
			<Meters>{formatDepth(depth, depthUnit, DEPTH_DISPLAY_STEP)}</Meters>
		</Container>
	);
}
