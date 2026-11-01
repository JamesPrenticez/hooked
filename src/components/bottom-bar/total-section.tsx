import styled from "styled-components";

import { ExtractionMultiplier } from "@components/extraction-multiplier";
import { BonusMultipliers } from "@components/fish-market";

const Bonuses = styled.div`
	position: absolute;
	bottom: 18rem;
	left: 0;
	pointer-events: none;
`;

/** The landing multiplier and payout (top third of the screen), and the bonus multipliers above the bar. (The total bet lives in the bar.) */
export const TotalSection = () => {
	return (
		<>
			<Bonuses>
				<BonusMultipliers />
			</Bonuses>
			<ExtractionMultiplier />
		</>
	);
};
