import styled from "styled-components";

import castLineText from "@assets/bottom-bar/cast-line-text.png";
import mainButton from "@assets/bottom-bar/main-button.png";
import mainButtonHover from "@assets/bottom-bar/main-button-hover.png";
import mainButtonPressed from "@assets/bottom-bar/main-button-pressed.png";
import { breakpoint } from "@utils/breakpoint";

const CastButton = styled.button`
	pointer-events: auto;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 12rem;
	aspect-ratio: 1983 / 793;
	border: none;
	background: url(${mainButton}) center / contain no-repeat;
	cursor: pointer;

	&:hover:not(:disabled) {
		background-image: url(${mainButtonHover});
	}

	&:active:not(:disabled) {
		background-image: url(${mainButtonPressed});
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
		width: 15rem;
	}
`;

const CastLabel = styled.img`
	width: 64%;
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
	/** The fish market is being dealt: there is nothing to cast or surface yet. */
	disabled?: boolean;
	onCast: () => void;
}

export const CallToActionSection = ({ descending, disabled = false, onCast }: CallToActionSectionProps) => {
	return (
		<CastButton type="button" aria-pressed={descending} disabled={disabled} onClick={onCast}>
			{descending ? <SurfaceLabel>Surface</SurfaceLabel> : <CastLabel src={castLineText} alt="Cast Line" />}
		</CastButton>
	);
};
