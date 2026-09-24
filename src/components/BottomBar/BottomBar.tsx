import styled from "styled-components";

import { BettingBoard } from "@components/BettingBoard";
import { BetInput, Button } from "@hooked-ui";
import { useBalanceStore } from "@stores/balanceStore";
import { CHIP_VALUES, selectTotalCents, useBetStore } from "@stores/betStore";
import { breakpoint } from "@utils/breakpoint";
import { formatMoney } from "@utils/formatMoney";

const Bar = styled.div`
	position: absolute;
	left: 0;
	right: 0;
	bottom: 0;
	display: flex;
	flex-direction: column;
	gap: var(--spacing-sm);
	max-width: 90rem;
	margin: 0 auto;
	padding: 0 var(--spacing-sm) var(--spacing-sm);
	/* Only the controls and board are interactive; the bar itself never
	 * blocks taps to whatever's behind it. */
	pointer-events: none;
`;

const Controls = styled.div`
	display: grid;
	grid-template-columns: 1fr auto 1fr;
	align-items: end;
	gap: var(--spacing-sm);
`;

const Chip = styled(BetInput)`
	pointer-events: auto;
	height: auto;
	max-width: 20rem;
`;

const Total = styled.div`
	pointer-events: auto;
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: var(--spacing-xs);
	color: var(--color-white);
	text-align: right;
`;

const TotalLabel = styled.span`
	font: var(--font-display-xxs);
	color: var(--color-primary-accent);
`;

const TotalAmount = styled.span`
	font: var(--font-display-sm);
	font-variant-numeric: tabular-nums;
`;

const Icon = styled.svg`
	width: 2.8rem;
	height: 2.8rem;

	@media ${breakpoint.landscape} {
		width: 2rem;
		height: 2rem;
	}

	@media ${breakpoint.tablet} {
		width: 3.4rem;
		height: 3.4rem;
	}
`;

const CastButton = styled.button`
	pointer-events: auto;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 0.2rem;
	width: 8.8rem;
	height: 8.8rem;
	border: 0.3rem solid var(--color-primary);
	border-radius: 50%;
	background: radial-gradient(
		circle at 35% 30%,
		color-mix(in srgb, var(--color-primary) 35%, var(--color-black)),
		var(--color-black) 75%
	);
	color: var(--color-primary-accent);
	cursor: pointer;

	&[aria-pressed="true"] {
		border-color: var(--color-primary-accent);
		box-shadow: 0 0 0 0.6rem color-mix(in srgb, var(--color-primary) 25%, transparent);
	}

	span {
		font: var(--font-display-legal);
		letter-spacing: 0.06em;
	}

	/* Landscape phones: a smaller cast button leaves the scene visible. */
	@media ${breakpoint.landscape} {
		width: 6.4rem;
		height: 6.4rem;
	}

	@media ${breakpoint.tablet} {
		width: 10.8rem;
		height: 10.8rem;
	}
`;

interface BottomBarProps {
	descending: boolean;
	onCast: () => void;
}

/**
 * Mobile-first bottom UI (reference: `src/assets/reference/mobile-reference.webp`):
 * chip selector, cast-line control, total wager, and the betting board.
 * Autoplay, last catch and the nav strip are the rest of BUILD_PLAN §8 and
 * aren't built yet.
 *
 * Cast toggles the client-only descent view (App.tsx) — bets aren't submitted
 * to the server yet, and the board locks while descending.
 */
export function BottomBar({ descending, onCast }: BottomBarProps) {
	const chip = useBetStore(s => s.chip);
	const setChip = useBetStore(s => s.setChip);
	const clear = useBetStore(s => s.clear);
	const total = useBetStore(selectTotalCents);
	const currency = useBalanceStore(s => s.currency) ?? "USD";
	const money = (cents: number) => formatMoney(cents, currency);

	return (
		<Bar>
			<Controls>
				<Chip
					label="Chip"
					orientation="vertical"
					value={chip}
					increments={CHIP_VALUES}
					format={money}
					disabled={descending}
					onValueChange={setChip}
					fullWidth
				/>
				<CastButton type="button" aria-pressed={descending} onClick={onCast}>
					<Icon viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
						<circle cx="12" cy="5" r="2.5" strokeWidth="2" />
						<line x1="12" y1="7.5" x2="12" y2="21" strokeWidth="2" />
						<path d="M8 11h8" strokeWidth="2" strokeLinecap="round" />
						<path d="M4.5 13a7.5 7.5 0 0 0 15 0" strokeWidth="2" strokeLinecap="round" />
					</Icon>
					<span>{descending ? "Surface" : "Cast Line"}</span>
				</CastButton>
				<Total>
					<TotalLabel>Total bet</TotalLabel>
					<TotalAmount>{money(total)}</TotalAmount>
					<Button variant="flat" disabled={descending || total === 0} onClick={clear}>
						Clear
					</Button>
				</Total>
			</Controls>
			<BettingBoard disabled={descending} />
		</Bar>
	);
}
