import { useEffect } from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";

import { BettingBoard } from "@components/BettingBoard";
import { Button } from "@hooked-ui";
import { breakpoint } from "@utils/breakpoint";

const Overlay = styled.div`
	position: fixed;
	inset: 0;
	z-index: 9999;
	display: flex;
	align-items: flex-end;
	justify-content: center;
	padding: var(--spacing-md);
	background: color-mix(in srgb, var(--color-black) 65%, transparent);

	@media ${breakpoint.tablet} {
		align-items: center;
	}
`;

const Panel = styled.div`
	position: relative;
	display: flex;
	flex-direction: column;
	gap: var(--spacing-sm);
	width: 100%;
	max-width: 56rem;
	max-height: 85vh;
	overflow-y: auto;
`;

const CloseButton = styled.button`
	position: absolute;
	top: 0.4rem;
	right: 0.4rem;
	z-index: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 3.2rem;
	height: 3.2rem;
	border: none;
	border-radius: 50%;
	background: color-mix(in srgb, var(--color-black) 70%, transparent);
	color: var(--color-white);
	font-size: 1.8rem;
	line-height: 1;
	cursor: pointer;

	&:hover {
		background: color-mix(in srgb, var(--color-black) 90%, transparent);
	}
`;

const DoneButton = styled(Button)`
	width: calc(100% - 2 * var(--spacing-md));
	margin: 0 auto var(--spacing-md);
`;

interface SelectTargetsModalProps {
	/** Locks the board — bets can't change once a round is under way. */
	disabled: boolean;
	onClose: () => void;
}

/** Full-screen overlay for `SelectTargetsSection` — the depth/species board used to live inline, now it's a modal (never-give-up's difficulty-picker pattern). Portals to `document.body` so it isn't clipped by the bar's own transformed/positioned ancestors. */
export function SelectTargetsModal({ disabled, onClose }: SelectTargetsModalProps) {
	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") onClose();
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [onClose]);

	return createPortal(
		<Overlay onClick={onClose}>
			<Panel role="dialog" aria-modal="true" aria-label="Select targets" onClick={event => event.stopPropagation()}>
				<CloseButton type="button" onClick={onClose} aria-label="Close">
					✕
				</CloseButton>
				<BettingBoard disabled={disabled} />
				<DoneButton variant="primary" onClick={onClose}>
					Done
				</DoneButton>
			</Panel>
		</Overlay>,
		document.body
	);
}
