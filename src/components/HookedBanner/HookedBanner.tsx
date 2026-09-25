import styled from "styled-components";

import { useHookStore } from "@stores/hookStore";
import { breakpoint } from "@utils/breakpoint";
import { ANNOUNCE_TICKS } from "@utils/simExtraction";

const Splash = styled.div`
	position: absolute;
	inset: 0;
	display: grid;
	place-items: center;
	overflow: hidden;
	pointer-events: none;
	user-select: none;
`;

/* Darkens the scene around the word so it reads against sky, water or fish. */
const Dim = styled.div`
	position: absolute;
	inset: 0;
	background: radial-gradient(
		circle at center,
		color-mix(in srgb, var(--color-black) 15%, transparent),
		color-mix(in srgb, var(--color-black) 65%, transparent)
	);
`;

/* The white flash as the line goes tight. */
const Flash = styled.div`
	position: absolute;
	inset: 0;
	background: var(--color-white);
`;

const Word = styled.div`
	position: relative;
	color: var(--color-primary);
	font: var(--font-display-xxxl);
	letter-spacing: 0.06em;
	text-transform: uppercase;
	text-shadow:
		0 0.4rem 0 var(--color-negative),
		0 1rem 2rem var(--color-black);

	@media ${breakpoint.tablet} {
		font: var(--font-display-xxxxxl);
	}
`;

/**
 * The "HOOKED!" splash: the moment after the fish has fought the hook and before the camera goes back to
 * the surface. The scene dims and flashes, the word slams in oversized and settles, then fades — all off
 * the sim's clock, so it follows the debug speed and a paused fake clock, and lasts exactly the sim's
 * `announce` phase. HTML overlay, a sibling of <Application> (§38).
 */
export function HookedBanner() {
	const sim = useHookStore(state => state.sim);
	if (sim?.phase !== "announce") return null;

	const progress = Math.min(1, (sim.tick - sim.phaseTick) / ANNOUNCE_TICKS);
	const fade = Math.min(1, progress / 0.08) * Math.min(1, (1 - progress) / 0.15);
	const slam = Math.max(0, 1 - progress / 0.14);
	const scale = 1 + 1.6 * slam * slam + 0.03 * Math.sin(progress * 40);

	return (
		<Splash role="status">
			<Dim style={{ opacity: fade }} />
			<Flash style={{ opacity: Math.max(0, 1 - progress / 0.1) * 0.5 }} />
			<Word style={{ opacity: fade, transform: `rotate(-4deg) scale(${scale})` }}>HOOKED!</Word>
		</Splash>
	);
}
