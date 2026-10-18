import { useState } from "react";
import styled from "styled-components";

import { Balance } from "@components/balance";
import { breakpoint } from "@utils/breakpoint";

import { BetSection } from "./bet-section";
import { BonusModal } from "./bonus-modal";
import { BonusSection } from "./bonus-section";
import { CallToActionSection } from "./call-to-action-section";
import { TotalSection } from "./total-section";
import { VolatilityModal } from "./volatility-modal";
import { VolatilitySection } from "./volatility-section";

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
	/** A round is open but the hook has not gone down: its fish market is still being dealt. Locks the bar like a cast. */
	revealing?: boolean;
	onCast: () => void;
}

/**
 * Mobile-first bottom UI: the stake, the cast-line control, the total and a
 * "Volatility" button and a "Bonus" button. Volatility opens
 * `VolatilityModal` (how deep the hook tends to dive), mirroring
 * never-give-up's difficulty picker. Bonus opens `BonusModal`, mirroring its
 * bonus-buy button.
 *
 * Cast opens a round on the server and deals its fish market (App.tsx); the
 * stake, volatility and bonuses lock from then until the catch is landed.
 */
export const BottomBar = ({ descending, revealing = false, onCast }: BottomBarProps) => {
	const [volatilityOpen, setVolatilityOpen] = useState(false);
	const [bonusOpen, setBonusOpen] = useState(false);
	const locked = descending || revealing;

	return (
		<>
			{/* Outside Container: its tablet transform would re-anchor an absolute child to the bar. */}
			<TotalSection />
			<Container>
				<Bar>
					<BonusSection disabled={locked} onOpen={() => setBonusOpen(true)} />
					<Balance />
					<BetSection disabled={locked} />
					<CallToActionSection descending={descending} disabled={revealing} onCast={onCast} />
					<VolatilitySection disabled={locked} onOpen={() => setVolatilityOpen(true)} />
				</Bar>

				{volatilityOpen && <VolatilityModal onClose={() => setVolatilityOpen(false)} />}
				{bonusOpen && <BonusModal onClose={() => setBonusOpen(false)} />}
			</Container>
		</>
	);
};
