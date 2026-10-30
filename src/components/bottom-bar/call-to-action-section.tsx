import styled from "styled-components";

import castButton from "@assets/bottom-bar/cast-button.png";
import castButtonHover from "@assets/bottom-bar/cast-button-hover.png";
import castButtonPressed from "@assets/bottom-bar/cast-button-pressed.png";
import castLineText from "@assets/bottom-bar/cast-line-text.png";
import { breakpoint } from "@utils/breakpoint";

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
	background: url(${castButton}) center / contain no-repeat;
	cursor: pointer;

	&:hover:not(:disabled) {
		background-image: url(${castButtonHover});
	}

	&:active:not(:disabled) {
		background-image: url(${castButtonPressed});
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
			{descending ? <SurfaceLabel>Surface</SurfaceLabel> : <CastLabel src={castLineText} alt="Cast Line" />}
		</CastButton>
	);
};
