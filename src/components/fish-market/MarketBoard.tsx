import { useMemo } from "react";
import styled from "styled-components";

import { useRoundStore } from "@stores/roundStore";
import { breakpoint } from "@utils/breakpoint";

import { marketZones } from "./marketLayout";
import { MarketTable } from "./MarketTable";

/* A sign on the left-hand dock, standing on the pier. Small on a phone, where the scene is short: the portrait phone's
 * top third holds about 20rem of it, and a landscape phone drops the zone names for their colour stripes. */
const Board = styled.section`
	--label-width: 5.8rem;
	--portrait: 2rem;
	--chip-gap: 0.2rem;
	--price-font: var(--font-text-legal);
	--zone-font: var(--font-text-legal);

	position: absolute;
	top: 6.8rem; /* below the Total bet panel */
	left: var(--spacing-md);
	display: flex;
	flex-direction: column;
	gap: var(--spacing-xs);
	box-sizing: border-box;
	width: min(34rem, calc(100vw - 2 * var(--spacing-md)));
	padding: var(--spacing-xs) var(--spacing-sm) var(--spacing-sm);
	border: var(--border-thickness) solid color-mix(in srgb, var(--color-primary) 40%, transparent);
	border-radius: var(--border-radius-lg);
	background: color-mix(in srgb, var(--color-black) 72%, transparent);
	color: var(--color-white);
	/* Display-only: it never blocks a tap on the scene behind it. */
	pointer-events: none;
	user-select: none;
	transition: opacity 0.3s ease;

	/* Out of the way while the hook is down, and while the reveal is still dealing — it lands as the reveal closes. */
	&[data-hidden] {
		opacity: 0;
		visibility: hidden;
		transition: none;
	}

	@media ${breakpoint.landscape} {
		--label-width: 0rem;
		--label-display: none;
		--zone-gap: 0;
		--stripe: 0.3rem;
		--stripe-gap: var(--spacing-xs);
		--portrait: 1.6rem;

		width: min(30rem, calc(100vw - 2 * var(--spacing-md)));
	}

	@media ${breakpoint.tablet} {
		--label-width: 7.6rem;
		--label-display: block;
		--zone-gap: var(--spacing-xs);
		--stripe: 0;
		--stripe-gap: 0;
		--portrait: clamp(2.4rem, 2.6vw, 3.4rem);
		--chip-gap: 0.4rem;
		--price-font: var(--font-text-bold-xxs);
		--zone-font: var(--font-text-bold-xxs);

		top: 8.4rem;
		width: min(46rem, calc(100vw - 2 * var(--spacing-md)));
		padding: var(--spacing-sm) var(--spacing-md) var(--spacing-md);
	}

	/* Beside the boat, not over it: on a landscape screen the board stays in the left third. */
	@media ${breakpoint.tabletLandscape} {
		--label-width: clamp(5.8rem, 6vw, 7.6rem);

		width: min(46rem, 32vw);
	}

	@media ${breakpoint.tabletLandscape} and (max-width: 1279px) {
		--price-font: var(--font-text-legal);
		--zone-font: var(--font-text-legal);
	}
`;

const Title = styled.h2`
	margin: 0;
	color: var(--color-primary-accent);
	font: var(--font-display-xs);
	letter-spacing: 0.08em;
`;

const Hint = styled.p`
	margin: 0;
	font: var(--font-text-xs);
	color: color-mix(in srgb, var(--color-white) 70%, transparent);
`;

interface MarketBoardProps {
	/** Underwater, or while the reveal pop-up is still dealing: present but not shown. */
	hidden: boolean;
}

/**
 * The fish market board on the docks: every fish and what it pays this round, a row per depth zone. It keeps the last
 * round's prices after the cast — the catch ringed — until the next cast deals a new market. Before the first cast it
 * is an empty sign. HTML overlay, a sibling of <Application> (§38).
 */
export function MarketBoard({ hidden }: MarketBoardProps) {
	const market = useRoundStore(s => s.round?.market);
	const caught = useRoundStore(s => (s.round?.status === "completed" ? s.round.outcome.fish : undefined));
	const zones = useMemo(() => (market ? marketZones(market) : []), [market]);

	return (
		<Board aria-label="Fish market" data-market-board data-hidden={hidden ? "" : undefined}>
			<Title>Fish market</Title>
			{zones.length ? <MarketTable zones={zones} caught={caught} /> : <Hint>Prices are posted when you cast.</Hint>}
		</Board>
	);
}
