import styled from "styled-components";

import { IconButton } from "@hooked-ui";
import { breakpoint } from "@utils/breakpoint";

/** Shared by `MenuSection`: the left-hand twin of the right-hand market and volatility buttons. */
export const SideTrigger = styled(IconButton)<{ $slot: number }>`
	pointer-events: auto;
	position: absolute;
	top: 0;
	left: calc(var(--spacing-sm) * ${p => p.$slot + 1} + 5.2rem * ${p => p.$slot}); /* right of the bonus button */
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
	}

	/* Desktop: positioned by the left-hand button column. */
	@media ${breakpoint.tablet} {
		position: static;
		width: var(--size-control);
		height: var(--size-control);
	}
`;
