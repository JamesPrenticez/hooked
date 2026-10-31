import ArrowIcon from "@icons/arrow.icon.svg?react";
import styled from "styled-components";

import { useHookStore } from "@stores/hookStore";

const KEYS = [
	{ key: "ArrowLeft", area: "left", turn: 270, label: "steer left" },
	{ key: "ArrowUp", area: "up", turn: 0, label: "slow descent" },
	{ key: "ArrowDown", area: "down", turn: 180, label: "speed descent" },
	{ key: "ArrowRight", area: "right", turn: 90, label: "steer right" }
];

/* Inverted-T, like a keyboard: ↑ over ↓, flanked by ← and →. */
const Pad = styled.div`
	display: grid;
	grid-template-areas:
		". up ."
		"left down right";
	gap: 0.25rem;
`;

const Wrap = styled.div`
	display: flex;
	align-items: center;
	gap: var(--spacing-sm);
`;

const Switch = styled.button`
	display: flex;
	align-items: center;
	gap: var(--spacing-sm);
	padding: 0;
	border: 0;
	background: none;
	color: var(--color-white);
	font: var(--font-display-xs);
	cursor: pointer;
`;

const Track = styled.span<{ $on: boolean }>`
	position: relative;
	width: 3rem;
	height: 1.5rem;
	border-radius: 999px;
	background: ${p => (p.$on ? "var(--color-secondary)" : "color-mix(in srgb, var(--color-black) 60%, transparent)")};
	box-shadow: inset 0 2px 4px color-mix(in srgb, var(--color-black) 50%, transparent);
	transition: background 0.15s;

	&::after {
		content: "";
		position: absolute;
		top: 0.1875rem;
		left: ${p => (p.$on ? "1.6875rem" : "0.1875rem")};
		width: 1.125rem;
		height: 1.125rem;
		border-radius: 50%;
		background: var(--color-white);
		box-shadow: 0 1px 3px color-mix(in srgb, var(--color-black) 60%, transparent);
		transition: left 0.15s;
	}
`;

/* A keycap: light face, dark rim, a thick lower edge that squashes when the key is held. */
const Cap = styled.span<{ $down: boolean }>`
	display: grid;
	place-items: center;
	width: 2.25rem;
	height: 2.25rem;
	border: 1px solid color-mix(in srgb, var(--color-black) 70%, transparent);
	border-radius: 0.375rem;
	background: ${p =>
		p.$down
			? "color-mix(in srgb, var(--color-white) 80%, var(--color-black))"
			: "linear-gradient(color-mix(in srgb, var(--color-white) 100%, transparent), color-mix(in srgb, var(--color-white) 85%, var(--color-black)))"};
	color: color-mix(in srgb, var(--color-black) 80%, transparent);
	font: var(--font-display-xs);
	user-select: none;
	transform: translateY(${p => (p.$down ? "3px" : "0")});
	box-shadow: ${p =>
		p.$down
			? "inset 0 2px 3px color-mix(in srgb, var(--color-black) 40%, transparent), 0 0 0 color-mix(in srgb, var(--color-black) 55%, var(--color-white))"
			: "inset 0 1px 0 var(--color-white), 0 3px 0 color-mix(in srgb, var(--color-black) 55%, var(--color-white)), 0 4px 0 color-mix(in srgb, var(--color-black) 70%, transparent)"};
	transition:
		transform 0.05s,
		box-shadow 0.05s;
`;

/** Debug dock: arrow keycaps that sink while their key is held, and the control-mode switch. */
export function DebugControls() {
	const on = useHookStore(state => state.hookMode === "control");
	const setHookMode = useHookStore(state => state.setHookMode);
	const heldKeys = useHookStore(state => state.heldKeys);

	return (
		<Wrap>
			<Pad>
				{KEYS.map(k => (
					<Cap key={k.key} style={{ gridArea: k.area }} $down={heldKeys.includes(k.key)} title={k.label}>
						<ArrowIcon width="60%" height="60%" style={{ transform: `rotate(${k.turn}deg)` }} />
					</Cap>
				))}
			</Pad>
			<Switch
				role="switch"
				aria-checked={on}
				title="control mode"
				aria-label="control mode"
				onClick={() => setHookMode(on ? "auto" : "control")}
			>
				<Track $on={on} />
			</Switch>
		</Wrap>
	);
}
