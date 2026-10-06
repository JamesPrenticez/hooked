import type { ComponentPropsWithoutRef } from "react";
import { viewportMobileDV } from "@hooked-utils/design-viewport-helper";
import { ICONS } from "@icons";
import { svgBorderStyles } from "@styles/svgBorder";
import styled, { css } from "styled-components";

import { Button, CloseButton } from "@hooked-ui";
import { breakpoint } from "@utils/breakpoint";

const Container = styled.div<{
	$svgBorder?: boolean;
	$borderColor?: string;
	$glowColor?: string;
}>`
	position: relative;
	box-sizing: border-box;
	border-radius: var(--border-radius);

	width: 100%;
	height: min(90dvh, 60dvh);
	padding: 0.4rem 0.2rem;
	display: flex;
	flex-direction: column;
	border-radius: var(--border-radius-md);

	header {
		display: flex;
		justify-content: center;
		align-items: center;
		flex-shrink: 0;
		&.withClose {
			justify-content: space-between;
		}

		height: var(--size-control);

		& .title {
			color: var(--color-primary);
		}

		& .close-button {
			margin-left: auto;
		}
	}

	&:after {
		content: "";
		width: calc(100% + 1rem);
		height: calc(100% + 1.5rem);
		z-index: -1;
		background-color: var(--color-black);
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		border-radius: var(--border-radius-md);
	}
	${({ $svgBorder, $borderColor }) =>
		$svgBorder
			? css`
					${svgBorderStyles($borderColor)}
				`
			: css`
					background: rgba(8, 8, 8, 0.1);
					backdrop-filter: blur(0.1rem);
				`}

	${({ $glowColor }) =>
		$glowColor &&
		css`
			box-shadow:
				0 0 8px color-mix(in srgb, ${$glowColor} 55%, transparent),
				0 0 16px color-mix(in srgb, ${$glowColor} 35%, transparent);
		`}

	@media ${breakpoint.landscape} {
		padding: ${viewportMobileDV(8, "height", "landscape")} ${viewportMobileDV(8, "width", "landscape")};
	}

	@media ${breakpoint.tablet} {
		padding: 1rem;
	}

	@media ${breakpoint.tablet} {
		/* height: auto; */
		width: 42rem;

		& .header {
			& .title {
				font-size: var(--font-size-md);
			}
		}
	}
`;
const CallToAction = styled.div`
	display: flex;
	width: 100%;
	gap: 1.2rem;
	margin-top: 1.2rem;
	flex: 1;
	align-items: flex-end;
	flex-direction: column;
	@media ${breakpoint.landscape} {
		margin-top: ${viewportMobileDV(12, "height", "landscape")};
		flex-direction: row;
	}
	@media ${breakpoint.tablet} {
		gap: var(--spacing-md);
		margin-top: var(--spacing-lg);
		flex-direction: row;
	}
	> button {
		display: flex;
		align-items: center;
		justify-content: center;
		flex: 1 1 0;
		width: 100%;
		@media ${breakpoint.tablet} {
			width: auto;
		}
	}
`;

type ModalProps = ComponentPropsWithoutRef<"div"> & {
	title?: string;
	withBackConfirmButtons?: boolean;
	svgBorder?: boolean;
	borderColor?: string;
	glowColor?: string;
	onCloseClick?: () => void;
	onConfirmClick?: () => void;
};

export const Modal = ({
	title,
	withBackConfirmButtons,
	svgBorder,
	borderColor,
	glowColor,
	onCloseClick,
	onConfirmClick,
	children,
	...rest
}: ModalProps) => {
	return (
		<Container
			$svgBorder={svgBorder}
			$borderColor={borderColor}
			$glowColor={glowColor}
			{...rest}
			onClick={(e: React.MouseEvent) => e.stopPropagation()}
		>
			<header>
				{title && <h2 className="title">{title}</h2>}

				{onCloseClick && (
					<CloseButton className="close-button" aria-label="Close" onClick={onCloseClick}>
						{ICONS.XIcon}
					</CloseButton>
				)}
			</header>

			{children}

			{withBackConfirmButtons && (
				<CallToAction>
					<Button variant="negative" onClick={onCloseClick}>
						BACK
					</Button>
					<Button variant="primary" onClick={onConfirmClick}>
						CONFIRM
					</Button>
				</CallToAction>
			)}
		</Container>
	);
};
