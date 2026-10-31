import styled from "styled-components";

import { useHookStore } from "@stores/hookStore";

const Trigger = styled.button`
	padding: 0.6rem 1.2rem;
	border: 1px solid var(--color-primary-accent);
	border-radius: var(--border-radius-sm);
	background: color-mix(in srgb, var(--color-primary-accent) 20%, transparent);
	color: var(--color-white);
	font: var(--font-display-xs);
	letter-spacing: 0.08em;
	cursor: pointer;

	&:disabled {
		opacity: 0.4;
		cursor: default;
	}
`;

/** Debug dock: drills the running hook through the whole descent to the jackpot layer, to meet the Kraken. */
export function DrillButton() {
	const descending = useHookStore(state => state.sim?.phase === "descend");
	const requestDrill = useHookStore(state => state.requestDrill);

	return (
		<Trigger title="drill to the jackpot layer" disabled={!descending} onClick={requestDrill}>
			DRILL
		</Trigger>
	);
}
