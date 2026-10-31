import { InnerShadowText } from "@styles/inner-shadow-text";
import { svgBorderStyles } from "@styles/svgBorder";
import { FRAME_BLEED, SvgBorderFrame } from "@styles/svgBorderFrame";
import styled, { css } from "styled-components";

import type { VolatilityLevel } from "@constants/volatility";
import { breakpoint } from "@utils/breakpoint";

const Card = styled.button<{ $disabled?: boolean }>`
	position: relative;
	margin-top: 4rem;
	padding: ${FRAME_BLEED};
	max-width: 30rem;
	border: none;
	background: none;
	color: inherit;
	font: inherit;
	text-align: inherit;
	user-select: none;
	cursor: ${({ $disabled }) => ($disabled ? "default" : "pointer")};

	@media ${breakpoint.tablet}, ${breakpoint.landscape} {
		margin-top: 0;
	}

	&:focus-visible {
		outline: none;
	}
`;

const CardInner = styled.span`
	position: relative;
	display: flex;
	flex-direction: column;
	width: 100%;
	border-radius: var(--border-radius-lg);

	@media ${breakpoint.tablet} {
		min-width: 24rem;
	}
`;

const Frame = styled(SvgBorderFrame)<{ $active?: boolean; $disabled?: boolean }>`
	color: ${({ $active }) => ($active ? "var(--color-primary)" : "color-mix(in srgb, var(--color-primary) 40%, transparent)")};

	${Card}:focus-visible & {
		color: var(--color-primary-accent);
	}
	${Card}:hover & {
		${({ $disabled }) =>
			!$disabled &&
			css`
				color: var(--color-primary-hover);
			`}
	}
`;

/* Sits on the card's top edge, in a mirrored copy of the same border. */
const Badge = styled.span<{ $color: string }>`
	position: absolute;
	top: 0;
	left: 50%;
	translate: -50% -40%;
	z-index: 1;
	width: 3.2rem;
	background-color: var(--color-black);
	border-radius: var(--border-radius-md);
	${({ $color }) => svgBorderStyles($color, { flipVertical: true })}
	border-image-slice: 20 fill;
	border-color: ${({ $color }) => $color};

	img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	@media ${breakpoint.tablet} {
		width: 5.2rem;
	}
`;

const ImageSlot = styled.span`
	position: relative;
	display: block;
	width: 100%;
	max-height: 34rem;
	aspect-ratio: 4 / 3.2;
	padding-top: 1.5rem;

	@media ${breakpoint.tablet} {
		width: auto;
	}
`;

const ImageMask = styled.span`
	position: absolute;
	inset: 0;
	overflow: hidden;
	border-radius: var(--border-radius-md);

	&::after {
		content: "";
		position: absolute;
		bottom: 0;
		width: 100%;
		height: 4rem;
		background: linear-gradient(to top, var(--color-black), color-mix(in srgb, var(--color-black) 0%, transparent));
	}

	img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
`;

const Info = styled.span<{ $color: string }>`
	display: flex;
	flex: 1;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: var(--spacing-xs);
	padding: 0 var(--spacing-md) var(--spacing-md);
	background: var(--color-black);
	color: ${({ $color }) => $color};
	text-align: center;
`;

const Name = styled.span`
	display: block;
	font: var(--font-display-md);
	text-transform: uppercase;
`;

const Description = styled.span`
	display: block;
	font: var(--font-text-xs);
	line-height: 1.3;
	color: color-mix(in srgb, var(--color-white) 75%, transparent);
`;

interface VolatilityCardProps {
	level: VolatilityLevel;
	active?: boolean;
	onClick?: () => void;
}

/** One volatility level: art, a badge on its top edge and the name, in a framed card. `active` marks the level in force. */
export const VolatilityCard = ({ level, active, onClick }: VolatilityCardProps) => (
	<Card type="button" aria-pressed={active} onClick={onClick}>
		<CardInner>
			<Badge $color={level.color}>
				<img src={level.icon} alt="" />
			</Badge>
			<ImageSlot>
				<ImageMask>
					<img src={level.image} alt="" />
				</ImageMask>
			</ImageSlot>
			<Info $color={level.color}>
				<InnerShadowText>
					<Name>{level.label}</Name>
				</InnerShadowText>
				<Description>{level.description}</Description>
			</Info>
		</CardInner>
		<Frame $active={active} />
	</Card>
);
