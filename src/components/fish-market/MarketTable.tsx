import type { CSSProperties } from "react";
import styled, { css, keyframes } from "styled-components";

import { formatMultiplier } from "@utils/formatMultiplier";

import { DROP_MS, FIRST_DROP_MS, type MarketZone, STAGGER_MS } from "./marketLayout";

const pulse = keyframes`
	from {
		box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-primary) 0%, transparent);
	}
	to {
		box-shadow: 0 0 0.8rem 0.2rem color-mix(in srgb, var(--color-primary) 80%, transparent);
	}
`;

const drop = keyframes`
	from {
		opacity: 0;
		transform: translateY(-2.4rem) scale(0.5) rotate(-8deg);
	}
	70% {
		opacity: 1;
		transform: translateY(0.3rem) scale(1.08) rotate(2deg);
	}
	to {
		opacity: 1;
		transform: none;
	}
`;

/* The container sets the table's scale: `--label-width` (0 hides the names, leaving the zone's colour stripe), `--portrait`,
 * `--chip-gap`, `--price-font` and `--zone-font`. */
const Zone = styled.section`
	display: grid;
	grid-template-columns: var(--label-width, 6.4rem) minmax(0, 1fr);
	align-items: center;
	gap: var(--zone-gap, var(--spacing-xs));

	&[data-zone="shallow"] {
		--zone-color: var(--color-depth-shallow);
	}
	&[data-zone="reef"] {
		--zone-color: var(--color-depth-reef);
	}
	&[data-zone="deep"] {
		--zone-color: var(--color-depth-deep);
	}
	&[data-zone="abyss"] {
		--zone-color: var(--color-depth-abyss);
	}
	&[data-zone="jackpot"] {
		--zone-color: var(--color-depth-jackpot);
	}
`;

/* Not a heading: the section is already named, and headings are forced wide-spaced, which "Shallow" can't afford. */
const ZoneName = styled.span`
	display: var(--label-display, block);
	grid-column: 1;
	padding-left: var(--spacing-xs);
	border-left: 0.3rem solid var(--zone-color);
	color: var(--color-white);
	font: var(--zone-font, var(--font-text-bold-xxs));
	font-weight: var(--font-weight-semibold);
	letter-spacing: 0.04em;
	text-transform: uppercase;
`;

const Fish = styled.ul`
	display: grid;
	grid-column: 2;
	grid-template-columns: repeat(var(--columns, 7), minmax(0, 1fr));
	gap: var(--chip-gap, 0.4rem);
	margin: 0;
	padding: 0 0 0 var(--stripe-gap, 0);
	border-left: var(--stripe, 0) solid var(--zone-color);
	list-style: none;
`;

const Chip = styled.li<{ $animate: boolean }>`
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 0.1rem;
	min-width: 0;
	padding: 0.3rem 0.1rem;
	border: var(--border-thickness) solid color-mix(in srgb, var(--zone-color) 70%, transparent);
	border-radius: var(--border-radius-sm);
	background: color-mix(in srgb, var(--zone-color) 28%, var(--color-black));
	color: var(--color-white);
	text-align: center;

	&[data-caught] {
		outline: 0.2rem solid var(--color-primary-accent);
		background: color-mix(in srgb, var(--zone-color) 55%, var(--color-black));
	}

	&[data-bonus] {
		outline: 0.2rem solid var(--color-primary);
		background: color-mix(in srgb, var(--color-primary) 35%, var(--color-black));
		animation: ${pulse} 1s ease-in-out infinite alternate;

		@media (prefers-reduced-motion: reduce) {
			animation: none;
		}
	}

	${({ $animate }) =>
		$animate &&
		css`
			animation: ${drop} ${DROP_MS}ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
			animation-delay: calc(${FIRST_DROP_MS}ms + var(--i) * ${STAGGER_MS}ms);

			@media (prefers-reduced-motion: reduce) {
				animation: none;
			}
		`}
`;

const Portrait = styled.img`
	width: min(var(--portrait, 3rem), 100%);
	height: var(--portrait, 3rem);
	object-fit: contain;
`;

/* A fish with no portrait yet is drawn by name, in the portrait's place. */
const Name = styled.span`
	display: grid;
	place-items: center;
	width: 100%;
	height: var(--portrait, 3rem);
	overflow: hidden;
	font: var(--font-text-legal);
	line-height: 1;
`;

/* The bonus a highlighted fish pays on top of its price, riding its top edge. */
const Bonus = styled.span`
	position: absolute;
	top: -0.6rem;
	left: 50%;
	transform: translateX(-50%);
	padding: 0 0.3rem;
	border-radius: var(--border-radius-sm);
	background: var(--color-primary);
	color: var(--color-black);
	font: var(--font-text-legal);
	font-weight: var(--font-weight-semibold);
	font-variant-numeric: tabular-nums;
	white-space: nowrap;
`;

const Price = styled.span`
	color: var(--color-white);
	font: var(--price-font, var(--font-text-bold-xxs));
	font-variant-numeric: tabular-nums;

	[data-best] > & {
		color: var(--color-primary);
	}
`;

interface MarketTableProps {
	zones: MarketZone[];
	/** The fish the round landed, once it is over — ringed on the board. */
	caught?: string;
	/** The fish highlighted this round, and the bonus each pays on top of its price if it is the one landed. */
	bonus?: Map<string, number>;
	/** Deal the chips onto the board one after another, as the reveal pop-up does. */
	animate?: boolean;
}

/** Every fish and what it pays this round, a row per depth zone — the one table the dock board and the reveal share. */
export function MarketTable({ zones, caught, bonus, animate = false }: MarketTableProps) {
	let dealt = 0;
	return (
		<>
			{zones.map(zone => (
				<Zone key={zone.id} data-zone={zone.id} aria-label={zone.label}>
					<ZoneName>{zone.label}</ZoneName>
					<Fish>
						{zone.fish.map(fish => (
							<Chip
								key={fish.id}
								$animate={animate}
								data-fish={fish.id}
								data-best={fish.multiplier === zone.best ? "" : undefined}
								data-caught={fish.id === caught ? "" : undefined}
								data-bonus={bonus?.has(fish.id) ? "" : undefined}
								style={{ "--i": dealt++ } as CSSProperties}
							>
								{bonus?.has(fish.id) && <Bonus>+{formatMultiplier(bonus.get(fish.id)!)}×</Bonus>}
								{fish.image ? <Portrait src={fish.image} alt={fish.name} /> : <Name>{fish.name}</Name>}
								<Price>×{formatMultiplier(fish.multiplier)}</Price>
							</Chip>
						))}
					</Fish>
				</Zone>
			))}
		</>
	);
}
