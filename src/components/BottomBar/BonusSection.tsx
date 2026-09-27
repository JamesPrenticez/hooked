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

	@media ${breakpoint.tablet} {
		position: absolute;
		top: 0;
		left: var(--spacing-sm);
		transform: translateY(calc(-100% - var(--spacing-sm)));
		width: 6.8rem;
		height: 6.8rem;
		padding: 0.8rem;

		/* The kit's desktop icon is sized for its own 10.4rem button. */
		span span:first-of-type {
			width: 4.4rem;
			height: 4.4rem;
		}
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
