import ArrowIcon from "@icons/arrow.icon.svg?react";
import styled from "styled-components";

import { useHookStore } from "@stores/hookStore";

const KEYS = [
	{ key: "ArrowLeft", area: "left", turn: 270, label: "steer left" },
	{ key: "ArrowUp", area: "up", turn: 0, label: "slow descent" },
	{ key: "ArrowDown", area: "down", turn: 180, label: "speed descent" },
	{ key: "ArrowRight", area: "right", turn: 90, label: "steer right" }
];

/* Inverted-T, like a keyboard: ↑ over ↓, flanked by ← and →. The whole pad is the auto/manual toggle. */
const Pad = styled.button<{ $on: boolean }>`
	display: grid;
	grid-template-areas:
		". up ."
		"left down right";
	gap: 0.25rem;
	padding: 0;
	border: 0;
	background: none;
	cursor: pointer;
	filter: ${p => (p.$on ? "none" : "grayscale(1) opacity(0.5)")};
	transition: filter 0.15s;
`;

/* A keycap: light face, dark rim, a thick lower edge that squashes when the key is held. */
const Cap = styled.span<{ $down: boolean }>`
	display: grid;
	place-items: center;
	width: 2.25rem;
	height: 2.25rem;
	border: 1px solid color-mix(in srgb, var(--color-black) 70%, transparent);
	border-radius: 0.375rem;
	--face: var(--color-white);
	background: ${p =>
		p.$down
			? "color-mix(in srgb, var(--face) 80%, var(--color-black))"
			: "linear-gradient(var(--face), color-mix(in srgb, var(--face) 85%, var(--color-black)))"};
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

/** Debug dock: arrow keycaps that sink while their key is held; clicking them switches between auto and manual. */
export function DebugControls() {
	const on = useHookStore(state => state.hookMode === "manual");
	const setHookMode = useHookStore(state => state.setHookMode);
	const heldKeys = useHookStore(state => state.heldKeys);

	return (
		<Pad
			role="switch"
			aria-checked={on}
			title={on ? "manual mode (click for auto)" : "auto mode (click for manual)"}
			aria-label="manual mode"
			$on={on}
			onClick={() => setHookMode(on ? "auto" : "manual")}
		>
			{KEYS.map(k => (
				<Cap key={k.key} style={{ gridArea: k.area }} $down={heldKeys.includes(k.key)} title={k.label}>
					<ArrowIcon width="60%" height="60%" style={{ transform: `rotate(${k.turn}deg)` }} />
				</Cap>
			))}
		</Pad>
	);
}
