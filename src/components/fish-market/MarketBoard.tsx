import { useEffect, useMemo, useState } from "react";
import styled from "styled-components";

import { getMarket } from "@api";
import { useBetStore } from "@stores/betStore";
import { useRoundStore } from "@stores/roundStore";
import type { MarketEntry } from "@type/api";
import { breakpoint } from "@utils/breakpoint";

import { marketZones } from "./marketLayout";
import { MarketTable } from "./MarketTable";

/* A landscape phone drops the zone names for their colour stripes. */
const Board = styled.section`
	--label-width: 5.8rem;
	--portrait: 2rem;
	--chip-gap: 0.2rem;
	--price-font: var(--font-text-legal);
	--zone-font: var(--font-text-legal);

	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing-xs);
	min-height: 0;
	overflow-y: auto;
	padding: var(--spacing-xs) var(--spacing-sm) var(--spacing-sm);
	color: var(--color-white);
	user-select: none;

	@media ${breakpoint.landscape} {
		--label-width: 0rem;
		--label-display: none;
		--zone-gap: 0;
		--stripe: 0.3rem;
		--stripe-gap: var(--spacing-xs);
		--portrait: 1.6rem;
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
	}
`;

const Hint = styled.p`
	margin: 0;
	font: var(--font-text-xs);
	color: color-mix(in srgb, var(--color-white) 70%, transparent);
`;

/**
 * The fish market board: every fish and what it pays this round, a row per depth zone. It keeps the last round's
 * prices after the cast — the catch ringed — until the next cast deals a new market. Shown in `MarketModal`.
 */
export function MarketBoard() {
	const volatility = useBetStore(s => s.volatility);
	const roundMarket = useRoundStore(s => s.round?.market);
	// The market is fixed per volatility, so the idle sign is stocked before the first cast; the round's own list
	// stands in until it arrives.
	const [listed, setListed] = useState<MarketEntry[]>();
	useEffect(() => {
		getMarket(volatility).then(setListed, () => setListed(undefined));
	}, [volatility]);
	const market = listed ?? roundMarket;
	const bonus = useRoundStore(s => s.round?.bonus);
	const bonuses = useMemo(() => new Map(bonus?.map(b => [b.fish, Number(b.multiplier)])), [bonus]);
	const caught = useRoundStore(s =>
		s.round?.status === "completed" && !s.round.outcome.escaped ? s.round.outcome.fish : undefined
	);
	const zones = useMemo(() => (market ? marketZones(market) : []), [market]);

	return (
		<Board aria-label="Fish market" data-market-board>
			{zones.length ? <MarketTable zones={zones} caught={caught} bonus={bonuses} /> : <Hint>Loading prices…</Hint>}
		</Board>
	);
}
