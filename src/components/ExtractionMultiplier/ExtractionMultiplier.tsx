import styled, { keyframes } from "styled-components";

import { useHookStore } from "@stores/hookStore";
import { extractionAt, gearsFor, shownMultiplier } from "@utils/simExtraction";

const pop = keyframes`
	from {
		transform: scale(1.5);
	}
	to {
		transform: scale(1);
	}
`;

const Readout = styled.div`
	position: absolute;
	top: 30%;
	left: var(--spacing-md);
	transform-origin: left center;
	color: var(--color-primary);
	font: var(--font-display-xxxl);
	font-variant-numeric: tabular-nums;
	text-shadow:
		0 0.3rem 0 var(--color-negative),
		0 0.8rem 1.6rem var(--color-black);
	pointer-events: none;
	user-select: none;
`;

/* Re-keyed on the gear, so it slams in again each time a bigger one takes over. */
const Value = styled.span`
	display: inline-block;
	animation: ${pop} 0.35s ease-out;
`;

/**
 * The multiplier climbing while a catch is landed: it ticks up as the fish comes out, sticks while a gear strains
 * against it and jumps as the next takes over. Off the sim's clock, like `HookedBanner`. HTML overlay.
 */
export function ExtractionMultiplier() {
	const sim = useHookStore(state => state.sim);
	if (sim?.phase !== "extract") return null;

	const { stage, reveal } = extractionAt(gearsFor(sim.multiplier), sim.catchM, sim.tick - sim.phaseTick);
	if (stage === "haul") return null;

	return (
		<Readout role="status" aria-label="Catch multiplier">
			<Value key={stage}>×{shownMultiplier(sim.multiplier, reveal)}</Value>
		</Readout>
	);
}
