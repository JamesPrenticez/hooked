import styled from "styled-components";

import { ICONS } from "@hooked-ui";

const Meter = styled.span`
	display: inline-flex;
	align-items: center;
	justify-content: center;
	color: var(--color-primary);
	line-height: 0;

	svg {
		width: var(--chevron-size, 1.2rem);
		height: var(--chevron-size, 1.2rem);
		/* Overlapped, so a full meter still fits a small button. */
		margin: 0 calc(var(--chevron-size, 1.2rem) * -0.2);
	}
`;

interface DepthMeterProps {
	/** How many chevrons: how deep the hook tends to dive. */
	depth: 1 | 2 | 3;
	className?: string;
}

/** A row of down-chevrons, one to three — how deep a volatility sends the hook. Decorative: the level is named beside it. */
export const DepthMeter = ({ depth, className }: DepthMeterProps) => (
	<Meter className={className} aria-hidden="true" data-depth={depth}>
		{Array.from({ length: depth }, (_, i) => (
			<span key={i}>{ICONS.ChevronIcon}</span>
		))}
	</Meter>
);
