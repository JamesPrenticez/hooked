import { type PropsWithChildren, useRef } from "react";
import styled, { css } from "styled-components";

import { IconButton, ICONS } from "@hooked-ui";
import { useCanvasFreeze } from "@hooks/use-canvas-freeze";
import { useFocusTrap } from "@hooks/use-focus-trap";
import { breakpoint } from "@utils/breakpoint";

const PANEL_CLOSE_MS = 500;

const Container = styled.div<{
	$backgroundImage?: string;
	$backgroundDim?: number;
	$noBackground?: boolean;
	$backgroundHidden?: boolean;
	$closing?: boolean;
}>`
	position: fixed;
	inset: 0;
	background: ${({ $backgroundImage, $noBackground, $backgroundHidden }) =>
		$noBackground ? "transparent" : $backgroundImage && !$backgroundHidden ? "transparent" : "rgba(8, 8, 8, 0.7)"};
	backdrop-filter: ${({ $noBackground }) => ($noBackground ? "none" : "blur(0.5rem)")};
	transition: background-color 400ms ease;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: flex-start;
	z-index: 150;
	@media ${breakpoint.tablet} {
		justify-content: center;
	}

	${({ $closing }) =>
		$closing &&
		css`
			animation: overlayFadeOut ${PANEL_CLOSE_MS}ms ease forwards;
			pointer-events: none;
		`}

	${({ $backgroundImage, $backgroundHidden, $backgroundDim = 0.7 }) =>
		$backgroundImage &&
		css`
			&::before {
				content: "";
				position: absolute;
				inset: 0;
				z-index: -1;
				background:
					linear-gradient(rgba(8, 8, 8, ${$backgroundDim}), rgba(8, 8, 8, ${$backgroundDim})),
					url(${$backgroundImage}) center / cover no-repeat;
				opacity: ${$backgroundHidden ? 0 : 1};
				transition: opacity 400ms ease;
			}
		`}

	.close-btn {
		position: absolute;
		top: var(--spacing-md);
		right: var(--spacing-md);

		@media ${breakpoint.tablet} {
			top: var(--spacing-lg);
			right: var(--spacing-lg);
		}
	}
`;

type OverlayProps = PropsWithChildren<{
	onClick?: () => void;
	withCloseButton?: boolean;
	noBackground?: boolean;
	backgroundImage?: string;
	backgroundDim?: number;
	backgroundHidden?: boolean;
	closing?: boolean;
	/** Leaves the page behind reachable by keyboard, for pop-ups that must not block the game UI. */
	noFocusTrap?: boolean;
	className?: string;
}>;

export const Overlay = ({
	withCloseButton,
	onClick,
	backgroundImage,
	backgroundDim,
	backgroundHidden,
	noBackground,
	closing,
	noFocusTrap,
	className,
	children
}: OverlayProps) => {
	// This overlay covers the canvas, so there is nothing to see behind it and
	// no reason to keep drawing. Freezing also makes the container's
	// `backdrop-filter` nearly free: it is only costly while the content behind
	// it changes. `noBackground` overlays are transparent, so the canvas stays
	// visible and must keep rendering.
	useCanvasFreeze(!noBackground);

	const containerRef = useRef<HTMLDivElement>(null);
	useFocusTrap(containerRef, !noFocusTrap);

	return (
		<Container
			ref={containerRef}
			onClick={onClick}
			className={className}
			$noBackground={noBackground}
			$backgroundImage={backgroundImage}
			$backgroundDim={backgroundDim}
			$backgroundHidden={backgroundHidden}
			$closing={closing}
		>
			{withCloseButton && <IconButton onClick={onClick} icon={ICONS.XIcon} aria-label="close button" />}
			{children}
		</Container>
	);
};
