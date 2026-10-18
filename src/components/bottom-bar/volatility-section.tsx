import styled from "styled-components";

import { volatilityLevel } from "@constants/volatility";
import { IconButton } from "@hooked-ui";
import { useBetStore } from "@stores/betStore";
import { breakpoint } from "@utils/breakpoint";

import { DepthMeter } from "./depth-meter";

const Trigger = styled(IconButton)`
	pointer-events: auto;
	position: absolute;
	top: 0;
	right: var(--spacing-sm);
	transform: translateY(calc(-100% - var(--spacing-sm)));
	width: 5.2rem;
	height: 5.2rem;

	/* Landscape phones: inline inside the bar instead of floating above it. */
	@media ${breakpoint.landscape} {
		position: relative;
		top: auto;
		right: auto;
		transform: none;
		width: 4.2rem;
		height: 4.2rem;
	}

	@media ${breakpoint.tablet} {
		position: absolute;
		top: 50%;
		right: auto;
		left: calc(100% + var(--spacing-sm));
		transform: translateY(-50%);
		width: calc(var(--size-control) * 1.25);
		height: calc(var(--size-control) * 1.25);
	}
`;

const Level = styled.span`
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 0.3rem;
	pointer-events: none;
`;

const Name = styled.span`
	font: var(--font-display-legal);
	letter-spacing: 0.06em;
	text-transform: uppercase;
`;

interface VolatilitySectionProps {
	disabled: boolean;
	onOpen: () => void;
}

/** Shows the volatility the next cast is made at — how deep the hook tends to dive — and opens `VolatilityModal` to change it. */
export const VolatilitySection = ({ disabled, onOpen }: VolatilitySectionProps) => {
	const level = volatilityLevel(useBetStore(s => s.volatility));

	return (
		<Trigger
			disabled={disabled}
			onClick={onOpen}
			aria-haspopup="dialog"
			aria-label={`Volatility, ${level.label}`}
			icon={
				<Level>
					<Name>{level.short}</Name>
					<DepthMeter depth={level.depth} />
				</Level>
			}
		/>
	);
};
