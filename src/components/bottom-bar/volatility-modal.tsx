import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { InnerShadowText } from "@styles/inner-shadow-text";
import styled from "styled-components";

import { VOLATILITY_LEVELS } from "@constants/volatility";
import { Button, Overlay } from "@hooked-ui";
import { Modal } from "@hooked-ui/modal";
import { useBetStore } from "@stores/betStore";
import { breakpoint } from "@utils/breakpoint";

import { VolatilityCard } from "./volatility-card";

/* Narrow portrait phones: one card at a time, picked from the tabs. Everywhere else all three sit side by side. */
const NARROW_PORTRAIT = "(orientation: portrait) and (max-width: 767px)";

const Panel = styled(Modal)`
	&& {
		width: 100%;
		height: auto;
		max-height: 100dvh;
		overflow-y: auto;
		background: transparent;
		backdrop-filter: unset;

		&::after {
			display: none;
		}

		@media ${breakpoint.tablet} {
			width: 80%;
		}
	}
`;

const Title = styled(InnerShadowText)`
	display: block;
	margin-top: var(--spacing-lg);
	font: var(--font-display-sm);
	color: var(--color-primary);
	text-align: center;

	@media ${breakpoint.landscape} {
		font: var(--font-display-xs);
		margin-top: 0;
	}

	@media ${breakpoint.tablet} {
		font: var(--font-display-xl);
		margin-top: 0;
	}
`;

const Tabs = styled.div`
	display: none;

	@media ${NARROW_PORTRAIT} {
		display: flex;
		height: var(--size-control);
		margin: var(--spacing-lg);
		overflow: hidden;
		border: var(--border-thickness) solid color-mix(in srgb, var(--color-primary) 40%, transparent);
		border-radius: var(--border-radius-md);
		background: var(--color-black);
	}
`;

const Tab = styled.button<{ $color: string }>`
	display: flex;
	flex: 1;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 0.2rem;
	margin: 0.3rem;
	padding: 0.1rem 0.8rem;
	border: none;
	border-radius: var(--border-radius-sm);
	background: transparent;
	color: color-mix(in srgb, ${({ $color }) => $color} 20%, transparent);
	font: var(--font-display-xxs);
	text-transform: uppercase;
	cursor: pointer;

	&[aria-selected="true"] {
		background: color-mix(in srgb, var(--color-white) 10%, transparent);
		color: ${({ $color }) => $color};
	}

	img {
		width: 2.4rem;
		height: 2.4rem;
		opacity: 0.2;
	}

	&[aria-selected="true"] img {
		opacity: 1;
	}
`;

const Cards = styled.div<{ $selected: string }>`
	display: flex;
	flex: 1;
	flex-direction: column;
	align-items: center;
	gap: var(--spacing-lg);
	min-height: 0;
	padding: 0 var(--spacing-lg);

	& > * {
		width: 100%;
	}

	@media ${NARROW_PORTRAIT} {
		& > :not([data-level="${({ $selected }) => $selected}"]) {
			display: none;
		}
	}

	@media ${breakpoint.tablet}, ${breakpoint.landscape} {
		flex-direction: row;
		align-items: flex-start;
		justify-content: center;
		margin-top: var(--spacing-lg);

		& > * {
			flex: 1 1 0;
			min-width: 0;
			max-width: 32rem;
		}
	}

	@media ${breakpoint.landscape} and (max-height: 400px) {
		& > * {
			max-width: 46dvh;
		}
	}
`;

const Apply = styled(Button)`
	display: block;
	width: calc(100% - 2 * var(--spacing-md));
	max-width: 30rem;
	margin: 2rem auto 4rem;

	@media ${breakpoint.tablet}, ${breakpoint.landscape} {
		display: none;
	}
`;

interface VolatilityModalProps {
	onClose: () => void;
}

/** Full-screen overlay for `VolatilitySection`: how deep the hook tends to dive. Picking a level applies it and closes. Portals to `document.body` so it isn't clipped by the bar's own transformed/positioned ancestors. */
export const VolatilityModal = ({ onClose }: VolatilityModalProps) => {
	const volatility = useBetStore(s => s.volatility);
	const setVolatility = useBetStore(s => s.setVolatility);
	const [selected, setSelected] = useState(volatility);

	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (event.key === "Escape") onClose();
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [onClose]);

	const apply = (id: typeof volatility) => {
		setVolatility(id);
		onClose();
	};

	return createPortal(
		<Overlay onClick={onClose}>
			<Panel role="dialog" aria-modal="true" aria-label="Volatility" onCloseClick={onClose}>
				<Title>SELECT YOUR VOLATILITY</Title>

				<Tabs role="tablist" aria-label="Volatility">
					{VOLATILITY_LEVELS.map(level => (
						<Tab
							key={level.id}
							type="button"
							role="tab"
							aria-selected={level.id === selected}
							$color={level.color}
							onClick={() => setSelected(level.id)}
						>
							<img src={level.icon} alt="" />
							{level.label}
						</Tab>
					))}
				</Tabs>

				<Cards $selected={selected} role="group" aria-label="How deep the hook dives">
					{VOLATILITY_LEVELS.map(level => (
						<div key={level.id} data-level={level.id}>
							<VolatilityCard level={level} active={level.id === volatility} onClick={() => apply(level.id)} />
						</div>
					))}
				</Cards>

				<Apply onClick={() => apply(selected)}>APPLY</Apply>
			</Panel>
		</Overlay>,
		document.body
	);
};
