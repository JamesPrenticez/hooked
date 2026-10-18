import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import styled from "styled-components";

import { useRoundStore } from "@stores/roundStore";
import { breakpoint } from "@utils/breakpoint";

import { dealMs, marketZones } from "./marketLayout";
import { MarketTable } from "./MarketTable";

/** How long the prices stay up once the last chip has landed, and how long the pop-up takes to fly to the board. */
const HOLD_MS = 900;
const REDUCED_MOTION_HOLD_MS = 1600;
const FLIGHT_MS = 450;

const Backdrop = styled.div`
	position: fixed;
	inset: 0;
	z-index: 9999;
	display: grid;
	place-items: center;
	padding: var(--spacing-md);
	background: color-mix(in srgb, var(--color-black) 60%, transparent);
	cursor: pointer;
	transition: background-color ${FLIGHT_MS}ms ease;

	&[data-leaving] {
		background: transparent;
	}
`;

const Panel = styled.div`
	--label-width: 6rem;
	--portrait: 2.4rem;
	--chip-gap: 0.3rem;
	--price-font: var(--font-text-legal);
	--zone-font: var(--font-text-legal);

	display: flex;
	flex-direction: column;
	gap: var(--spacing-sm);
	box-sizing: border-box;
	width: min(50rem, 100%);
	max-height: 100%;
	padding: var(--spacing-md);
	border: var(--border-thickness) solid color-mix(in srgb, var(--color-primary) 60%, transparent);
	border-radius: var(--border-radius-lg);
	background: color-mix(in srgb, var(--color-black) 88%, transparent);
	color: var(--color-white);
	transition:
		transform ${FLIGHT_MS}ms cubic-bezier(0.5, 0, 0.8, 0.4),
		opacity ${FLIGHT_MS}ms ease;
	user-select: none;

	/* A short screen has no room for the names, only their colour stripes. */
	@media ${breakpoint.landscape} {
		--label-width: 0rem;
		--label-display: none;
		--zone-gap: 0;
		--stripe: 0.3rem;
		--stripe-gap: var(--spacing-xs);
		--portrait: 2.2rem;

		gap: var(--spacing-xs);
		padding: var(--spacing-sm) var(--spacing-md);
	}

	@media ${breakpoint.tablet} {
		--label-width: 8rem;
		--label-display: block;
		--zone-gap: var(--spacing-xs);
		--stripe: 0;
		--stripe-gap: 0;
		--portrait: 4.4rem;
		--chip-gap: 0.6rem;
		--price-font: var(--font-text-bold-xs);
		--zone-font: var(--font-text-bold-xs);

		padding: var(--spacing-md);
	}
`;

const Title = styled.h2`
	margin: 0;
	color: var(--color-primary);
	font: var(--font-display-md);
	letter-spacing: 0.08em;
	text-align: center;
`;

const Subtitle = styled.p`
	margin: 0;
	color: var(--color-primary-accent);
	font: var(--font-display-xxs);
	letter-spacing: 0.08em;
	text-align: center;
	text-transform: uppercase;
`;

const Hint = styled.p`
	margin: 0;
	color: color-mix(in srgb, var(--color-white) 60%, transparent);
	font: var(--font-text-xs);
	text-align: center;
`;

/** Where the pop-up ends up: over the dock board, shrunk to its size, fading as it lands. */
function flightToBoard(panel: HTMLElement | null): CSSProperties {
	const board = document.querySelector("[data-market-board]")?.getBoundingClientRect();
	const from = panel?.getBoundingClientRect();
	if (!board || !from) return { opacity: 0 };
	const dx = board.left + board.width / 2 - (from.left + from.width / 2);
	const dy = board.top + board.height / 2 - (from.top + from.height / 2);
	return { transform: `translate(${dx}px, ${dy}px) scale(${Math.min(1, board.width / from.width)})`, opacity: 0.2 };
}

interface MarketRevealProps {
	/** The prices have been dealt and the pop-up has settled onto the board: time to cast. */
	onDone: () => void;
}

/**
 * The round's new fish market, dealt onto a board before the cast: each fish drops in with its price, the prices hold a
 * moment, then the whole board shrinks away onto the dock (`MarketBoard`). A tap, Enter or Escape skips the wait.
 * HTML overlay, a sibling of <Application> (§38).
 */
export function MarketReveal({ onDone }: MarketRevealProps) {
	const market = useRoundStore(s => s.round?.market);
	const zones = useMemo(() => (market ? marketZones(market) : []), [market]);
	const chips = zones.reduce((sum, zone) => sum + zone.fish.length, 0);

	const onDoneRef = useRef(onDone);
	useEffect(() => {
		onDoneRef.current = onDone;
	});
	const backdrop = useRef<HTMLDivElement>(null);
	const panel = useRef<HTMLDivElement>(null);
	const flying = useRef(false);
	const [flight, setFlight] = useState<CSSProperties>();

	const finish = useCallback(() => {
		if (flying.current) return;
		flying.current = true;
		setFlight(flightToBoard(panel.current));
	}, []);

	// Wait for the deal and a moment more, unless it is skipped.
	useEffect(() => {
		const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		const id = window.setTimeout(finish, reduced ? REDUCED_MOTION_HOLD_MS : dealMs(chips) + HOLD_MS);
		return () => window.clearTimeout(id);
	}, [chips, finish]);

	useEffect(() => {
		if (!flight) return;
		const id = window.setTimeout(() => onDoneRef.current(), FLIGHT_MS);
		return () => window.clearTimeout(id);
	}, [flight]);

	// Keys work as soon as it is up, whatever has focus.
	useEffect(() => {
		backdrop.current?.focus();
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape" || event.key === "Enter" || event.key === " ") finish();
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [finish]);

	return (
		<Backdrop
			ref={backdrop}
			role="dialog"
			aria-modal="true"
			aria-label="New fish market prices"
			tabIndex={-1}
			data-leaving={flight ? "" : undefined}
			onClick={finish}
		>
			<Panel ref={panel} style={flight}>
				<Title>Fish market</Title>
				<Subtitle>New prices posted</Subtitle>
				<MarketTable zones={zones} animate />
				<Hint>Tap to continue</Hint>
			</Panel>
		</Backdrop>
	);
}
