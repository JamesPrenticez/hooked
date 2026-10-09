import styled from "styled-components";

import { DEPTH_ZONES } from "@constants/depthZones";
import { FISH } from "@constants/fish";
import { useBalanceStore } from "@stores/balanceStore";
import { betKey, type BetType, useBetStore } from "@stores/betStore";
import { breakpoint } from "@utils/breakpoint";
import { formatMoney } from "@utils/formatMoney";

const Board = styled.section`
	pointer-events: auto;
	display: flex;
	flex-direction: column;
	gap: var(--spacing-sm);
	padding: var(--spacing-sm) 1rem 1rem;
	border: 0.2rem solid color-mix(in srgb, var(--color-primary) 40%, transparent);
	border-radius: 1.2rem;
	background: color-mix(in srgb, var(--color-black) 72%, transparent);
	color: var(--color-white);

	/* Landscape phones: short, wide — keep the scene visible above the board. */
	@media ${breakpoint.landscape} {
		gap: var(--spacing-xs);
		padding: var(--spacing-xs) var(--spacing-sm) 0.6rem;
	}

	@media ${breakpoint.tablet} {
		gap: var(--spacing-sm);
		padding: 1.2rem var(--spacing-md) 1.4rem;
	}
`;

const Title = styled.h2`
	margin: 0;
	text-align: center;
	font: var(--font-display-xs);
	letter-spacing: 0.06em;
	color: var(--color-primary-accent);
`;

const Depths = styled.div`
	display: grid;
	grid-template-columns: repeat(5, 1fr);
	gap: 0.6rem;
`;

const Name = styled.span`
	text-transform: uppercase;
`;

const Portrait = styled.img`
	width: 3rem;
	height: 3rem;
	object-fit: contain;
`;

const Stake = styled.span`
	font: var(--font-display-legal);
	color: var(--color-primary-accent);
`;

const Tile = styled.button`
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 0.2rem;
	border: 0.2rem solid transparent;
	color: inherit;
	cursor: pointer;

	&:disabled {
		cursor: default;
		opacity: 0.6;
	}
`;

const DepthTile = styled(Tile)`
	min-height: 5.6rem;
	padding: 0.4rem 0.2rem;
	border-radius: var(--border-radius-md);
	background: color-mix(in srgb, var(--tile-color) 45%, var(--color-black));
	font: var(--font-display-xxs);

	&[data-depth="shallow"] {
		--tile-color: var(--color-depth-shallow);
	}
	&[data-depth="reef"] {
		--tile-color: var(--color-depth-reef);
	}
	&[data-depth="deep"] {
		--tile-color: var(--color-depth-deep);
	}
	&[data-depth="abyss"] {
		--tile-color: var(--color-depth-abyss);
	}
	&[data-depth="jackpot"] {
		--tile-color: var(--color-depth-jackpot);
	}

	&[aria-pressed="true"] {
		border-color: var(--color-primary-accent);
		background: color-mix(in srgb, var(--tile-color) 80%, var(--color-black));
	}

	@media ${breakpoint.landscape} {
		min-height: 3.6rem;
	}

	@media ${breakpoint.tablet} {
		min-height: 5.6rem;
	}
`;

const SpeciesHeader = styled.div`
	font: var(--font-display-xxs);
	color: var(--color-primary-accent);
`;

const Optional = styled.span`
	color: color-mix(in srgb, var(--color-white) 60%, transparent);
`;

const Species = styled.div`
	display: flex;
	gap: 0.6rem;
	overflow-x: auto;
	padding-bottom: 0.2rem;
`;

const FishTile = styled(Tile)`
	flex: 0 0 auto;
	min-width: 6.4rem;
	min-height: 4.8rem;
	padding: 0.2rem var(--spacing-sm);
	white-space: nowrap;
	border-radius: var(--border-radius-md);
	background: color-mix(in srgb, var(--color-white) 12%, var(--color-black));
	font: var(--font-display-legal);
	text-align: center;

	&[aria-pressed="true"] {
		border-color: var(--color-primary-accent);
		background: color-mix(in srgb, var(--color-primary) 30%, var(--color-black));
	}

	@media ${breakpoint.landscape} {
		min-height: 4rem;
	}

	@media ${breakpoint.tablet} {
		min-height: 4.8rem;
	}
`;

interface BettingBoardProps {
	/** Locks every tile — bets can't change once a round is under way. */
	disabled?: boolean;
}

/**
 * "Choose your bets": one tile per depth zone plus a scrollable species row
 * (mobile-reference.webp). Tapping a tile bets it at the current chip; tapping
 * again removes it. A depth and a fish can both be live (GDD).
 */
export function BettingBoard({ disabled = false }: BettingBoardProps) {
	const bets = useBetStore(s => s.bets);
	const toggle = useBetStore(s => s.toggle);
	const currency = useBalanceStore(s => s.currency) ?? "USD";

	const tile = (
		type: BetType,
		selection: string,
		name: string,
		Component: typeof Tile,
		label = name,
		image?: string
	) => {
		const stake = bets[betKey(type, selection)];
		return (
			<Component
				key={selection}
				type="button"
				data-depth={type === "depth" ? selection : undefined}
				aria-pressed={stake !== undefined}
				aria-label={label}
				disabled={disabled}
				onClick={() => toggle(type, selection)}
			>
				{image && <Portrait src={image} alt="" />}
				<Name>{name}</Name>
				{stake !== undefined && <Stake>{formatMoney(stake, currency)}</Stake>}
			</Component>
		);
	};

	return (
		<Board aria-label="Select targets">
			<Title>Select Targets</Title>
			<Depths>
				{DEPTH_ZONES.filter(zone => zone.id !== "trench").map(zone => tile("depth", zone.id, zone.label, DepthTile))}
			</Depths>
			<SpeciesHeader>
				Species <Optional>(optional)</Optional>
			</SpeciesHeader>
			<Species>
				{FISH.map(fish => tile("fish", fish.id, fish.name, FishTile, `${fish.name} (${fish.depth})`, fish.image))}
			</Species>
		</Board>
	);
}
