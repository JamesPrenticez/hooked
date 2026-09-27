import styled from "styled-components";

import selectTargetsIcon from "@assets/bottom-bar/select-targets.png";
import { IconButton } from "@hooked-ui";
import { useBetStore } from "@stores/betStore";
import { breakpoint } from "@utils/breakpoint";

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
		top: 0;
		right: var(--spacing-sm);
		transform: translateY(calc(-100% - var(--spacing-sm)));
		width: 6.8rem;
		height: 6.8rem;
	}
`;

const Icon = styled.img`
	width: 100%;
	height: 100%;
	object-fit: contain;
	pointer-events: none;
`;

const Badge = styled.span`
	position: absolute;
	top: -0.2rem;
	right: -0.2rem;
	min-width: 2rem;
	height: 2rem;
	padding: 0 0.4rem;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 999px;
	background: var(--color-negative);
	color: var(--color-white);
	font: var(--font-display-legal);
	line-height: 1;
`;

interface SelectTargetsSectionProps {
	disabled: boolean;
	onOpen: () => void;
}

/** Opens `SelectTargetsModal` — replaces the always-visible betting board with a button + badge showing how many targets are active. */
export function SelectTargetsSection({ disabled, onOpen }: SelectTargetsSectionProps) {
	const count = useBetStore(s => Object.keys(s.bets).length);

	return (
		<Trigger
			disabled={disabled}
			onClick={onOpen}
			aria-haspopup="dialog"
			aria-label={count > 0 ? `Select targets, ${count} selected` : "Select targets"}
			icon={
				<>
					<Icon src={selectTargetsIcon} alt="" />
					{count > 0 && <Badge>{count}</Badge>}
				</>
			}
		/>
	);
}
