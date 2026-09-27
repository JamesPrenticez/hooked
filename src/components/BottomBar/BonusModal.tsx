import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";

import { BONUSES } from "@constants/bonuses";
import { Button } from "@hooked-ui";
import { breakpoint } from "@utils/breakpoint";

import { BonusCard } from "./BonusCard";

// ponytail: the overlay and Escape handling repeat SelectTargetsModal's — pull a shared Modal out when a third one lands.
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
	display: flex;
	flex-direction: column;
	gap: var(--spacing-md);
	width: 100%;
	max-width: 90rem;
	max-height: 85vh;
	overflow-y: auto;
`;

const Title = styled.h2`
	text-align: center;
	font: var(--font-display-sm);
	color: var(--color-primary-accent);
`;

const Cards = styled.ul`
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: var(--spacing-sm);
	list-style: none;

	@media ${breakpoint.landscape}, ${breakpoint.tablet} {
		grid-template-columns: repeat(4, 1fr);
	}
`;

const CloseButton = styled(Button)`
	align-self: center;
	min-width: 16rem;
`;

interface BonusModalProps {
	onClose: () => void;
}

/** Full-screen overlay listing the GDD's bonus concepts as cards. Portals to `document.body` so it isn't clipped by the bar's own positioned ancestors. */
export function BonusModal({ onClose }: BonusModalProps) {
	const titleId = useId();
	const closeRef = useRef<HTMLButtonElement>(null);

	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") onClose();
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [onClose]);

	// Focus moves into the dialog on open and back to whatever opened it on close.
	useEffect(() => {
		const opener = document.activeElement as HTMLElement | null;
		closeRef.current?.focus();
		return () => opener?.focus();
	}, []);

	return createPortal(
		<Overlay onClick={onClose}>
			<Panel role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={event => event.stopPropagation()}>
				<Title id={titleId}>Bonus</Title>
				<Cards>
					{BONUSES.map(bonus => (
						<BonusCard key={bonus.id} bonus={bonus} />
					))}
				</Cards>
				<CloseButton ref={closeRef} variant="primary" onClick={onClose}>
					Close
				</CloseButton>
			</Panel>
		</Overlay>,
		document.body
	);
}
