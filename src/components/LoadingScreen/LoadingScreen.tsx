import { useEffect, useState } from "react";
import styled, { keyframes } from "styled-components";

import background from "@assets/loading/background.svg";
import logo from "@assets/loading/logo.svg";
import { breakpoint } from "@utils/breakpoint";

const spin = keyframes`
	to {
		transform: rotate(360deg);
	}
`;

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
	gap: var(--spacing-xxl);
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
	animation: ${bob} 3s ease-in-out infinite;

	@media ${breakpoint.tablet} {
		width: min(60vw, 52rem);
	}

	@media (prefers-reduced-motion: reduce) {
		animation: none;
	}
`;

const Panel = styled.div`
	position: relative;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 1.4rem;
	padding: 2rem 2.8rem;
	border-radius: 1.2rem;
	background: color-mix(in srgb, var(--color-black) 55%, transparent);
`;

const Spinner = styled.span`
	width: 2.8rem;
	height: 2.8rem;
	border-radius: 50%;
	border: 0.3rem solid color-mix(in srgb, var(--color-white) 25%, transparent);
	border-top-color: var(--color-primary);
	animation: ${spin} 0.9s linear infinite;

	@media (prefers-reduced-motion: reduce) {
		animation: none;
	}
`;

const Bar = styled.div`
	width: min(70vw, 32rem);
	height: 0.8rem;
	border-radius: 0.4rem;
	overflow: hidden;
	background: color-mix(in srgb, var(--color-white) 15%, transparent);
`;

const Fill = styled.div`
	height: 100%;
	border-radius: 0.4rem;
	background: var(--color-primary);
	transition: width 0.2s ease-out;
`;

const Percent = styled.span`
	font: var(--font-display-xs);
	color: var(--color-primary-accent);
	letter-spacing: 0.08em;
	font-variant-numeric: tabular-nums;
`;

/**
 * The game's initial presentation (BUILD_PLAN §5.1): full-bleed background,
 * Hooked logo, a spinner, and a percentage progress bar.
 *
 * HTML overlay: a sibling of <Application>, never a child of it (§38). It
 * covers the canvas while the `loading` phase is active and unmounts when
 * the phase machine advances.
 */
export function LoadingScreen() {
	const progress = useFakeProgress();
	const pct = Math.round(progress);

	return (
		<Screen>
			<Background src={background} alt="" />

			<Logo src={logo} alt="Hooked" />

			<Panel>
				<Spinner role="status" aria-label="Loading" />
				<Bar>
					<Fill style={{ width: `${pct}%` }} />
				</Bar>
				<Percent>{pct}%</Percent>
			</Panel>
		</Screen>
	);
}

/**
 * Placeholder load progress for the §5.1 visual.
 *
 * ponytail: fake ramp — §5.2 ("Load required assets") replaces this with a
 * `progress` prop fed by `Assets.load`'s `onProgress`, and this hook is deleted.
 */
function useFakeProgress() {
	const [progress, setProgress] = useState(0);

	useEffect(() => {
		const id = setInterval(() => {
			setProgress(p => {
				if (p >= 100) {
					clearInterval(id);
					return 100;
				}
				return Math.min(100, p + Math.random() * 16 + 5);
			});
		}, 140);
		return () => clearInterval(id);
	}, []);

	return progress;
}
