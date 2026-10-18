import { useEffect } from "react";
import { createPortal } from "react-dom";

import { BettingBoard } from "@components/betting-board";
import { Button, Overlay } from "@hooked-ui";
import { Modal } from "@hooked-ui/modal";

interface SelectTargetsModalProps {
	/** Locks the board — bets can't change once a round is under way. */
	disabled: boolean;
	onClose: () => void;
}

/** Full-screen overlay for `SelectTargetsSection` — the depth/species board used to live inline, now it's a modal (never-give-up's difficulty-picker pattern). Portals to `document.body` so it isn't clipped by the bar's own transformed/positioned ancestors. */
export const SelectTargetsModal = ({ disabled, onClose }: SelectTargetsModalProps) => {
	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") onClose();
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [onClose]);

	return createPortal(
		<Overlay onClick={onClose}>
			<Modal
				title="Select Targets"
				role="dialog"
				aria-modal="true"
				aria-label="Select targets"
				onClick={event => event.stopPropagation()}
				onCloseClick={onClose}
			>
				<BettingBoard disabled={disabled} />
				<Button variant="primary" onClick={onClose}>
					Done
				</Button>
			</Modal>
		</Overlay>,
		document.body
	);
};
