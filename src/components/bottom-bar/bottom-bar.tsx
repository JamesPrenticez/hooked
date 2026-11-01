import { useState } from "react";
import styled from "styled-components";

import { Balance } from "@components/balance";
import { breakpoint } from "@utils/breakpoint";

import { AudioSection } from "./audio-section";
import { BetSection } from "./bet-section";
import { BonusModal } from "./bonus-modal";
import { BonusSection } from "./bonus-section";
import { CallToActionSection } from "./call-to-action-section";
import { MarketModal } from "./market-modal";
import { MarketSection } from "./market-section";
import { MasterVolume } from "./master-volume";
import { MenuSection } from "./menu-section";
import { TotalBet } from "./total-bet";
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
		bottom: var(--spacing-xxl);
		left: 50%;
		right: auto;
		transform: translateX(-50%);
		height: var(--size-control-double);
	}
`;

/* Phones: transparent, so each button keeps its own place against the bar. Desktop: the two stack inside the bar's right end. */
const SideButtons = styled.div`
	display: contents;

	@media ${breakpoint.tablet} {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
		margin-right: var(--spacing-sm);
	}
`;

/* Mirror of SideButtons on the bar's left end: menu above, audio at the bottom. */
const LeftButtons = styled.div`
	display: contents;

	@media ${breakpoint.landscape} {
		display: flex;
		order: -2;
	}

	@media ${breakpoint.tablet} {
		flex-direction: column-reverse;
		gap: var(--spacing-xs);
		margin-left: var(--spacing-sm);
	}
`;

/* Balance and total bet side by side. Last in the portrait column, first in the row from landscape up (never-give-up). */
const Stats = styled.div`
	order: 1;
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing-md);

	@media ${breakpoint.landscape} {
		order: -1;
		justify-content: flex-start;
		gap: var(--spacing-lg);
	}
`;

const Bar = styled.div`
	box-sizing: border-box;
	pointer-events: none;
	display: flex;
	flex-direction: column;
	flex-grow: 1;
	gap: var(--spacing-sm);
	padding: var(--spacing-sm) var(--spacing-md);
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
		padding: var(--spacing-sm) var(--spacing-md);
		border: var(--border-thickness) solid color-mix(in srgb, var(--color-primary) 40%, transparent);
		border-radius: 1.2rem;
	}
`;

interface BottomBarProps {
	descending: boolean;
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
export const BottomBar = ({ descending, onCast }: BottomBarProps) => {
	const [volatilityOpen, setVolatilityOpen] = useState(false);
	const [marketOpen, setMarketOpen] = useState(false);
	const [bonusOpen, setBonusOpen] = useState(false);
	const [volumeOpen, setVolumeOpen] = useState(false);

	return (
		<>
			{/* Outside Container: its tablet transform would re-anchor an absolute child to the bar. */}
			<TotalSection />
			<Container>
				<Bar>
					<LeftButtons>
						<AudioSection onOpenVolume={() => setVolumeOpen(true)} />
						<MenuSection />
					</LeftButtons>
					<BonusSection disabled={descending} onOpen={() => setBonusOpen(true)} />
					<Stats>
						<Balance />
						<TotalBet />
					</Stats>
					<BetSection disabled={descending} />
					<CallToActionSection descending={descending} onCast={onCast} />
					<SideButtons>
						<MarketSection onOpen={() => setMarketOpen(true)} />
						<VolatilitySection disabled={descending} onOpen={() => setVolatilityOpen(true)} />
					</SideButtons>
				</Bar>

				{volumeOpen && <MasterVolume onClose={() => setVolumeOpen(false)} />}
				{volatilityOpen && <VolatilityModal onClose={() => setVolatilityOpen(false)} />}
				{marketOpen && <MarketModal onClose={() => setMarketOpen(false)} />}
				{bonusOpen && <BonusModal onClose={() => setBonusOpen(false)} />}
			</Container>
		</>
	);
};
