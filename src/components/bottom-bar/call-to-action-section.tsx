import styled, { keyframes } from "styled-components";

import castButton from "@assets/bottom-bar/cast-button.webp";
import castButtonHover from "@assets/bottom-bar/cast-button-hover.webp";
import castButtonPressed from "@assets/bottom-bar/cast-button-pressed.webp";
import castLineText from "@assets/bottom-bar/cast-line-text.webp";
import { breakpoint } from "@utils/breakpoint";

const spin = keyframes`
	to {
		transform: rotate(360deg);
	}
`;

const CastButton = styled.button`
	pointer-events: auto;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	width: 12rem;
	aspect-ratio: 1;
	/* Taller than the bar: negative margins let the wheel overhang it without growing it. */
	margin-top: -3rem;
	padding: 0;
	border: none;
	background: none;
	cursor: pointer;
	position: relative;
	isolation: isolate;

	--wheel: url(${castButton});

	/* The same art on two layers, split at the edge of the blue glass: ::before (frame and handles) spins, ::after (glass) stays. */
	&::before,
	&::after {
		content: "";
		position: absolute;
		inset: 0;
		z-index: -1;
		background: var(--wheel) center / contain no-repeat;
	}

	&::before {
		mask-image: radial-gradient(circle closest-side, transparent 55%, #000 55.5%);
	}

	&::after {
		mask-image: radial-gradient(circle closest-side, #000 55%, transparent 55.5%);
	}

	&[aria-pressed="true"]::before {
		animation: ${spin} 1.2s cubic-bezier(0.2, 0.7, 0.2, 1);
	}

	@media (prefers-reduced-motion: reduce) {
		&[aria-pressed="true"]::before {
			animation: none;
		}
	}

	&:hover:not(:disabled) {
		--wheel: url(${castButtonHover});
	}

	&:active:not(:disabled) {
		--wheel: url(${castButtonPressed});
	}

	&:disabled {
		filter: grayscale(0.7) brightness(0.75);
		cursor: default;
	}

	/* Landscape phones: a smaller cast button leaves the scene visible. */
	@media ${breakpoint.landscape} {
		width: 9.6rem;
	}

	@media ${breakpoint.tablet} {
		width: 18rem;
		margin-top: -3.8rem;
		margin-bottom: -3.8rem;
		margin-left: auto;
	}
`;

const CastLabel = styled.img`
	width: 48%;
	height: auto;
	pointer-events: none;
`;

const SurfaceLabel = styled.span`
	font: var(--font-display-xs);
	color: var(--color-primary-accent);
	letter-spacing: 0.06em;
	pointer-events: none;
`;

interface CallToActionSectionProps {
	descending: boolean;
	onCast: () => void;
}

export const CallToActionSection = ({ descending, onCast }: CallToActionSectionProps) => {
	return (
		<CastButton type="button" aria-pressed={descending} onClick={onCast}>
			{descending ? <SurfaceLabel>Cash out</SurfaceLabel> : <CastLabel src={castLineText} alt="Cast Line" />}
		</CastButton>
	);
};
