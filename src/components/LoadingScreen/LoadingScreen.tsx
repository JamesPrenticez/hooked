import { useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";

import background from "@assets/loading/background.svg";
import logo from "@assets/loading/logo.svg";
import { MIN_LOADING_MS } from "@constants/config";
import { breakpoint } from "@utils/breakpoint";

const bob = keyframes`
	0%,
	100% {
		transform: translateY(0);
	}
	50% {
		transform: translateY(-1rem);
	}
`;

const Screen = styled.div`
	position: absolute;
	inset: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	overflow: hidden;
	background: var(--color-black);
	user-select: none;
`;

const Background = styled.img`
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
	object-fit: cover;
	opacity: 0.9;
`;

const Logo = styled.img`
	position: relative;
	width: min(78vw, 42rem);
	height: auto;
	margin-bottom: var(--spacing-xl);
	animation: ${bob} 3s ease-in-out infinite;

	@media ${breakpoint.tablet} {
		width: min(60vw, 52rem);
	}

	@media (prefers-reduced-motion: reduce) {
		animation: none;
	}
`;

const Bar = styled.div`
	position: relative;
	width: 80%;
	max-width: 44rem;
	height: 0.8rem;
	border-radius: 0.6rem;
	overflow: hidden;
	border: 0.15rem solid var(--color-primary);
	background: color-mix(in srgb, var(--color-black) 55%, transparent);

	@media ${breakpoint.tablet} {
		width: 50%;
		height: 1.2rem;
	}
`;

const Fill = styled.div`
	height: 100%;
	border-radius: 0.4rem;
	background: linear-gradient(90deg, var(--color-primary), var(--color-primary-accent));
`;

const Percent = styled.span`
	position: relative;
	margin-top: var(--spacing-md);
	font: var(--font-display-xs);
	color: var(--color-primary);
	letter-spacing: 0.08em;
	font-variant-numeric: tabular-nums;
`;
/**
 * The game's initial presentation (BUILD_PLAN §5.1): full-bleed background,
 * Hooked logo and a percentage progress bar, laid out like Never Give Up's.
 * `progress` is the 0–1 asset load; the bar also never runs ahead of a linear
 * ramp over MIN_LOADING_MS, so a fast load still shows a full sweep.
 *
 * HTML overlay: a sibling of <Application>, never a child of it (§38). It
 * covers the canvas while the `loading` phase is active and unmounts when
 * the phase machine advances.
 */
export function LoadingScreen({ progress }: { progress: number }) {
	const ramp = useMinRamp();
	const pct = Math.round(Math.min(progress * 100, ramp));

	return (
		<Screen>
			<Background src={background} alt="" />

			<Logo src={logo} alt="Hooked" />

			<Bar role="progressbar" aria-label="Loading" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
				<Fill style={{ width: `${pct}%` }} />
			</Bar>
			<Percent>{pct}%</Percent>
		</Screen>
	);
}

/** 0–100 over MIN_LOADING_MS, in step with the bootstrap's minimum-display gate. */
function useMinRamp() {
	const [ramp, setRamp] = useState(0);

	useEffect(() => {
		const start = performance.now();
		const id = setInterval(() => {
			const p = Math.min(100, ((performance.now() - start) / MIN_LOADING_MS) * 100);
			setRamp(p);
			if (p >= 100) clearInterval(id);
		}, 50);
		return () => clearInterval(id);
	}, []);

	return ramp;
}
