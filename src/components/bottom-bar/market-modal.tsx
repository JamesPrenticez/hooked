import { useEffect } from "react";
import { createPortal } from "react-dom";

import { MarketBoard } from "@components/fish-market";
import { Overlay } from "@hooked-ui";
import { Modal } from "@hooked-ui/modal";

interface MarketModalProps {
	onClose: () => void;
}

/** Full-screen overlay for `MarketSection`: every fish and what it pays. Portals to `document.body` like `VolatilityModal`. */
export const MarketModal = ({ onClose }: MarketModalProps) => {
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
				title="Fish market"
				role="dialog"
				aria-modal="true"
				aria-label="Fish market"
				onClick={event => event.stopPropagation()}
				onCloseClick={onClose}
			>
				<MarketBoard />
			</Modal>
		</Overlay>,
		document.body
	);
};
