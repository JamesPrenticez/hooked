import styled from "styled-components";

import { BonusButton } from "@hooked-ui";
import { breakpoint } from "@utils/breakpoint";

const Trigger = styled(BonusButton)`
	pointer-events: auto;
	position: absolute;
	top: 0;
	left: var(--spacing-sm);
	transform: translateY(calc(-100% - var(--spacing-sm)));
	width: 5.2rem;
	height: 5.2rem;

	/* Landscape phones: inline inside the bar instead of floating above it. */
	@media ${breakpoint.landscape} {
		position: relative;
		top: auto;
		left: auto;
		transform: none;
		width: 4.2rem;
		height: 4.2rem;
		padding: 0.4rem;
	}

	/* Desktop (never-give-up): 12rem-wide button flanking the bar's left edge, one control-stack tall. */
	@media ${breakpoint.tablet} {
		position: absolute;
		top: calc(-1 * var(--border-thickness));
		bottom: calc(-1 * var(--border-thickness));
		left: auto;
		right: calc(100% + var(--spacing-sm));
		transform: none;
		width: auto;
		aspect-ratio: 1;
		height: calc(100% + 2 * var(--border-thickness));
		padding: 0;
	}
`;

interface BonusSectionProps {
	disabled: boolean;
	onOpen: () => void;
}

/** Opens `BonusModal` — the mirror of `SelectTargetsSection` on the bar's left. */
export function BonusSection({ disabled, onOpen }: BonusSectionProps) {
	return <Trigger disabled={disabled} onClick={onOpen} aria-haspopup="dialog" aria-label="Bonus" title="Bonus" />;
}
