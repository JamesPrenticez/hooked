import { useEffect } from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";

import { VOLATILITY_LEVELS } from "@constants/volatility";
import { Overlay } from "@hooked-ui";
import { Modal } from "@hooked-ui/modal";
import { useBetStore } from "@stores/betStore";

import { DepthMeter } from "./depth-meter";

/* The panel has a fixed height, so the three levels share it rather than leave it empty. */
const Options = styled.div`
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: var(--spacing-sm);
	min-height: 0;
	padding: var(--spacing-sm);
	overflow-y: auto;
`;

const Option = styled.button`
	display: grid;
	flex: 1 1 0;
	grid-template-columns: minmax(0, 1fr) auto;
	align-content: center;
	align-items: center;
	gap: var(--spacing-xs) var(--spacing-md);
	padding: var(--spacing-sm) var(--spacing-md);
	border: 0.2rem solid transparent;
	border-radius: var(--border-radius-md);
	background: color-mix(in srgb, var(--color-white) 12%, var(--color-black));
	color: var(--color-white);
	text-align: left;
	cursor: pointer;

	&[aria-pressed="true"] {
		border-color: var(--color-primary-accent);
		background: color-mix(in srgb, var(--color-primary) 30%, var(--color-black));
	}
`;

const Name = styled.span`
	font: var(--font-display-sm);
	text-transform: uppercase;
`;

const Description = styled.span`
	grid-column: 1;
	font: var(--font-text-xs);
	line-height: 1.3;
	color: color-mix(in srgb, var(--color-white) 75%, transparent);
	text-transform: none;
`;

const Meter = styled(DepthMeter)`
	--chevron-size: 2.4rem;

	grid-row: 1 / span 2;
	grid-column: 2;
`;

interface VolatilityModalProps {
	onClose: () => void;
}

/** Full-screen overlay for `VolatilitySection`: how deep the hook tends to dive. Picking a level applies it and closes. Portals to `document.body` so it isn't clipped by the bar's own transformed/positioned ancestors. */
export const VolatilityModal = ({ onClose }: VolatilityModalProps) => {
	const volatility = useBetStore(s => s.volatility);
	const setVolatility = useBetStore(s => s.setVolatility);

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
				title="Volatility"
				role="dialog"
				aria-modal="true"
				aria-label="Volatility"
				onClick={event => event.stopPropagation()}
				onCloseClick={onClose}
			>
				<Options role="group" aria-label="How deep the hook dives">
					{VOLATILITY_LEVELS.map(level => (
						<Option
							key={level.id}
							type="button"
							aria-pressed={level.id === volatility}
							onClick={() => {
								setVolatility(level.id);
								onClose();
							}}
						>
							<Name>{level.label}</Name>
							<Description>{level.description}</Description>
							<Meter depth={level.depth} />
						</Option>
					))}
				</Options>
			</Modal>
		</Overlay>,
		document.body
	);
};
