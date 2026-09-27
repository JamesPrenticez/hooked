import { useState } from "react";
import styled from "styled-components";

import { Balance } from "@components/Balance";
import { breakpoint } from "@utils/breakpoint";

import { BetSection } from "./BetSection";
import { BonusModal } from "./BonusModal";
import { BonusSection } from "./BonusSection";
import { CallToActionSection } from "./CallToActionSection";
import { SelectTargetsModal } from "./SelectTargetsModal";
import { SelectTargetsSection } from "./SelectTargetsSection";
import { TotalSection } from "./TotalSection";

const Container = styled.div`
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;

	display: flex;
	align-items: center;
	gap: var(--spacing-sm);

	@media ${breakpoint.landscape} {
		height: 7.2rem;
	}

	@media ${breakpoint.tablet} {
		bottom: var(--spacing-lg);
		left: 50%;
		right: auto;
		transform: translateX(-50%);
		height: var(--size-control-double);
	}
`;

/* never-give-up's shape: a full-bleed, square-cornered column stack on a
 * portrait phone, laid flat into one edge-to-edge row on a landscape phone,
 * and only pulled into an inset, bordered, rounded pill at tablet+. */
const Bar = styled.div`
	box-sizing: border-box;
	/* Only the controls are interactive; the bar itself never blocks taps to whatever's behind it. */
	pointer-events: none;
	display: flex;
	flex-direction: column;
	flex-grow: 1;
	gap: var(--spacing-sm);
	padding: var(--spacing-sm);
	background: color-mix(in srgb, var(--color-black) 72%, transparent);

	@media ${breakpoint.landscape} {
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
	}

	@media ${breakpoint.tablet} {
		position: relative;
		width: min(90rem, calc(100vw - 30rem));
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		flex-grow: 0;
		padding: var(--spacing-md);
		border: var(--border-thickness) solid color-mix(in srgb, var(--color-primary) 40%, transparent);
		border-radius: 1.2rem;
	}
`;

interface BottomBarProps {
	descending: boolean;
	onCast: () => void;
}

/**
 * Mobile-first bottom UI: chip selector, cast-line control, total wager, a
 * "Select Targets" button and a "Bonus" button. The depth/species board
 * (`BettingBoard`) used to sit inline here; it now opens in
 * `SelectTargetsModal` instead, mirroring never-give-up's difficulty picker.
 * Bonus opens `BonusModal`, mirroring its bonus-buy button.
 *
 * Cast toggles the client-only descent view (App.tsx) — bets aren't submitted
 * to the server yet, and targets and bonuses lock while descending.
 */
export function BottomBar({ descending, onCast }: BottomBarProps) {
	const [targetsOpen, setTargetsOpen] = useState(false);
	const [bonusOpen, setBonusOpen] = useState(false);

	return (
		<Container>
			<Bar>
				<BonusSection disabled={descending} onOpen={() => setBonusOpen(true)} />
				<Balance />
				<BetSection disabled={descending} />
				<CallToActionSection descending={descending} onCast={onCast} />
				<TotalSection disabled={descending} />
				<SelectTargetsSection disabled={descending} onOpen={() => setTargetsOpen(true)} />
			</Bar>

			{targetsOpen && <SelectTargetsModal disabled={descending} onClose={() => setTargetsOpen(false)} />}
			{bonusOpen && <BonusModal onClose={() => setBonusOpen(false)} />}
		</Container>
	);
}
