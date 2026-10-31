import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styled, { keyframes } from "styled-components";

import { FISH } from "@constants/fish";
import { useBalanceStore } from "@stores/balanceStore";
import { type RoundSnapshot, useRoundStore } from "@stores/roundStore";
import type { DepthId } from "@type/api";

export const AUTO_CLOSE_SECONDS = 3;

/** One slogan per depth reached: the deeper the player went, the louder it gets. */
const SLOGANS: Record<DepthId, string> = {
	shallow: "Fresh off the pier!",
	reef: "Reef raider!",
	deep: "Into the deep!",
	abyss: "Abyss conqueror!",
	jackpot: "Legend of the trench!"
};
const ESCAPED_SLOGAN = "The one that got away";

const pop = keyframes`
	from { opacity: 0; transform: scale(0.8) translateY(2rem); }
	to { opacity: 1; transform: none; }
`;

const drain = keyframes`
	to { stroke-dashoffset: 100; }
`;

const Overlay = styled.div`
	position: fixed;
	inset: 0;
	z-index: 9999;
	display: grid;
	place-items: center;
	padding: var(--spacing-md);
	background: color-mix(in srgb, var(--color-black) 70%, transparent);
`;

/* $color is the depth's own palette entry; everything else on the card is mixed from it. */
const Card = styled.div<{ $color: string }>`
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing-sm);
	width: 100%;
	max-width: 28rem;
	padding: var(--spacing-xl) var(--spacing-lg) var(--spacing-lg);
	border: 0.25rem solid ${p => p.$color};
	border-radius: 1rem;
	background: radial-gradient(
		circle at top,
		color-mix(in srgb, ${p => p.$color} 55%, var(--color-black)),
		color-mix(in srgb, ${p => p.$color} 15%, var(--color-black))
	);
	box-shadow: 0 0 4rem color-mix(in srgb, ${p => p.$color} 60%, transparent);
	color: var(--color-white);
	text-align: center;
	animation: ${pop} 0.35s ease-out;
`;

const Timer = styled.div`
	position: absolute;
	top: var(--spacing-sm);
	left: var(--spacing-sm);
	display: grid;
	place-items: center;
	width: 2.5rem;
	height: 2.5rem;
	font: var(--font-display-xs);

	svg {
		position: absolute;
		inset: 0;
		transform: rotate(-90deg);
	}

	circle {
		fill: none;
		stroke-width: 4;
	}

	circle:first-child {
		stroke: color-mix(in srgb, var(--color-white) 25%, transparent);
	}

	circle:last-child {
		stroke: var(--color-white);
		stroke-dasharray: 100;
		stroke-dashoffset: 0;
		animation: ${drain} ${AUTO_CLOSE_SECONDS}s linear forwards;
	}
`;

const Slogan = styled.h2`
	font: var(--font-display-lg);
	color: var(--color-primary-accent);
	letter-spacing: 0.06em;
	text-transform: uppercase;
	text-shadow: 0 0.2rem 0 var(--color-black);
`;

const Portrait = styled.img`
	width: 10rem;
	height: 10rem;
	object-fit: contain;
	filter: drop-shadow(0 0.5rem 1rem var(--color-black));
`;

const Species = styled.div`
	font: var(--font-display-sm);
`;

const Amount = styled.div`
	font: var(--font-display-xxl);
	font-variant-numeric: tabular-nums;
	color: var(--color-primary);
	text-shadow: 0 0.25rem 0 var(--color-black);
`;

const Multiplier = styled.div`
	padding: 0.25rem 1rem;
	border-radius: 999px;
	background: color-mix(in srgb, var(--color-black) 50%, transparent);
	font: var(--font-display-sm);
`;

/** What a debug manual run caught. The run ignored the server's outcome, so this replaces it on the card. */
export interface ManualCatch {
	fish: string;
	depthM: number;
}

interface PayoutModalProps {
	onClose: () => void;
	manual?: ManualCatch;
}

/** The round as the manual run played it: the fish it caught at the price the round's market set for it. */
function manualRound(round: RoundSnapshot, { fish }: ManualCatch): RoundSnapshot {
	// The run ends at the surface, so its own depth says nothing: the fish's home zone themes the card.
	const depth = FISH.find(f => f.id === fish)?.depth ?? "shallow";
	const multiplier = round.market.find(m => m.fish === fish)?.multiplier ?? "0.00";
	const total = (Number(round.stake) * Number(multiplier)).toFixed(2);
	return {
		...round,
		outcome: { ...round.outcome, fish, depth, escaped: false, multiplier },
		payout: { ...round.payout, total }
	};
}

/**
 * The cash-out result: the fish caught, what it paid and at what multiplier, themed to the depth reached.
 * Closes itself after `AUTO_CLOSE_SECONDS` (the ring top-left counts it down) or on click. Reads the settled round
 * from roundStore, so mount it once the round has completed. Portals to `document.body` like the other modals.
 */
export function PayoutModal({ onClose, manual }: PayoutModalProps) {
	const settled = useRoundStore(s => s.round);
	const round = settled && manual ? manualRound(settled, manual) : settled;
	const currency = useBalanceStore(s => s.currency) ?? "EUR";
	const [secondsLeft, setSecondsLeft] = useState(AUTO_CLOSE_SECONDS);

	useEffect(() => {
		if (secondsLeft <= 0) return onClose();
		const id = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
		return () => clearTimeout(id);
	}, [secondsLeft, onClose]);

	if (!round) return null;
	const { outcome, payout } = round;
	const fish = FISH.find(f => f.id === outcome.fish);
	// Number() is display-only; the payout stays the server's decimal string (Rule 6b).
	const total = new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(payout.total));

	return createPortal(
		<Overlay onClick={onClose}>
			<Card role="dialog" aria-label="Payout" $color={`var(--color-depth-${outcome.depth})`}>
				<Timer role="timer" aria-label={`Closing in ${secondsLeft} seconds`}>
					<svg viewBox="0 0 40 40">
						<circle cx="20" cy="20" r="16" />
						<circle cx="20" cy="20" r="16" pathLength="100" />
					</svg>
					{secondsLeft}
				</Timer>
				<Slogan>{outcome.escaped ? ESCAPED_SLOGAN : SLOGANS[outcome.depth]}</Slogan>
				{fish?.image && <Portrait src={fish.image} alt={fish.name} />}
				<Species>{fish?.name ?? outcome.fish}</Species>
				<Amount>{total}</Amount>
				<Multiplier>×{Number(outcome.multiplier)}</Multiplier>
			</Card>
		</Overlay>,
		document.body
	);
}
