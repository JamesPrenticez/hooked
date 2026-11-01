import styled from "styled-components";

import selectTargets from "@assets/bottom-bar/select-targets.webp";
import { IconButton } from "@hooked-ui";
import { breakpoint } from "@utils/breakpoint";

const Trigger = styled(IconButton)`
	pointer-events: auto;
	position: absolute;
	top: 0;
	right: calc(var(--spacing-sm) * 2 + 5.2rem); /* left of the volatility button */
	transform: translateY(calc(-100% - var(--spacing-sm)));
	width: 5.2rem;
	height: 5.2rem;

	/* Landscape phones: inline inside the bar instead of floating above it. */
	@media ${breakpoint.landscape} {
		position: relative;
		top: auto;
		right: auto;
		transform: none;
		width: 4.2rem;
		height: 4.2rem;
	}

	/* Desktop: positioned by SideButtons, stacked with the volatility button. */
	@media ${breakpoint.tablet} {
		position: static;
		transform: none;
		width: var(--size-control);
		height: var(--size-control);
	}
`;

const Icon = styled.img`
	width: 100%;
	height: 100%;
	object-fit: contain;
	pointer-events: none;
`;

interface MarketSectionProps {
	onOpen: () => void;
}

/** Opens `MarketModal` — what each fish pays this round. Open to read even mid-cast: it's payout info only. */
export const MarketSection = ({ onOpen }: MarketSectionProps) => (
	<Trigger
		onClick={onOpen}
		aria-haspopup="dialog"
		aria-label="Fish market"
		title="Fish market"
		icon={<Icon src={selectTargets} alt="" />}
	/>
);
