import styled, { keyframes } from "styled-components";

import type { BonusItem } from "@constants/bonuses";
import { breakpoint } from "@utils/breakpoint";

/* Spans the grid's title/art/blurb rows so they line up across a row of cards, even when one title wraps. */
const Card = styled.li`
	display: grid;
	grid-row: span 3;
	grid-template-rows: subgrid;
	justify-items: center;
	gap: var(--spacing-sm);
	min-width: 0;
	padding: var(--spacing-sm);
	border: 0.2rem solid color-mix(in srgb, var(--color-primary) 40%, transparent);
	border-radius: 1.2rem;
	background: color-mix(in srgb, var(--color-black) 72%, transparent);
	color: var(--color-white);
	text-align: center;
`;

const Title = styled.h3`
	font: var(--font-display-xs);
	color: var(--color-primary-accent);
`;

/* Same breathing glow as never-give-up's imageGlow: 10px/55% out to 30px/100%, 3s. */
const glowPulse = keyframes`
	0%, 100% {
		filter: drop-shadow(0 0 1rem color-mix(in srgb, var(--glow-color) 55%, transparent));
	}
	50% {
		filter: drop-shadow(0 0 3rem var(--glow-color));
	}
`;

const Art = styled.img<{ $glow: string }>`
	width: 100%;
	height: 9rem;
	object-fit: contain;
	--glow-color: ${({ $glow }) => $glow};
	animation: ${glowPulse} 3s ease-in-out infinite;

	/* Landscape phones: short, wide — the art shrinks so the whole modal stays in view. */
	@media ${breakpoint.landscape} {
		height: 5rem;
	}

	@media ${breakpoint.tablet} {
		height: 14rem;
	}
`;

const Description = styled.p`
	font: var(--font-text-xxs);
	line-height: 1.3;

	@media ${breakpoint.tablet} {
		font: var(--font-text-xs);
		line-height: 1.3;
	}
`;

interface BonusCardProps {
	bonus: BonusItem;
}

/** One bonus concept: its art, name and the rules the GDD says it must disclose. Informational — nothing on it is purchasable yet. */
export const BonusCard = ({ bonus }: BonusCardProps) => {
	return (
		<Card>
			<Title>{bonus.title}</Title>
			<Art src={bonus.image} $glow={bonus.color} alt="" decoding="async" />
			<Description>{bonus.description}</Description>
		</Card>
	);
};
