import { useState } from "react";
import styled from "styled-components";

import { Button } from "@hooked-ui";
import { useBetStore } from "@stores/betStore";
import { HARBOUR_LAYOUT, type Tweak, TWEAK_KEYS, type TweakKey, useHarbourDebugStore } from "@stores/harbourDebugStore";
import { useHookStore } from "@stores/hookStore";
import { viewBreakpoint } from "@utils/breakpoint";
import { extractionAt, extractionTicks, gearsFor } from "@utils/simExtraction";
import { createSim, type Sim } from "@utils/simStep";

const Trigger = styled(Button)`
	padding: 0.6rem 1.2rem;
	border: 1px solid var(--color-primary-accent);
	border-radius: var(--border-radius-sm);
	background: color-mix(in srgb, var(--color-primary-accent) 20%, transparent);
	color: var(--color-white);
	font: var(--font-display-xs);
	letter-spacing: 0.08em;
	cursor: pointer;
`;

/* Not modal, docked top-left: the harbour has to stay visible and live while its sliders are dragged. */
const Panel = styled.dialog`
	position: fixed;
	inset: var(--spacing-md) auto auto var(--spacing-md);
	z-index: 20;
	width: min(90vw, 32rem);
	max-height: calc(100vh - 2 * var(--spacing-md));
	margin: 0;
	overflow-y: auto;
	padding: 1.6rem;
	border: none;
	border-radius: 1.2rem;
	background: color-mix(in srgb, var(--color-black) 85%, transparent);
	color: var(--color-white);
`;

const Header = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: var(--spacing-sm);
`;

const Group = styled.fieldset`
	display: flex;
	flex-direction: column;
	gap: 0.4rem;
	margin: 0 0 var(--spacing-sm);
	padding: var(--spacing-xs) 1.2rem 1.2rem;
	border: 1px solid color-mix(in srgb, var(--color-white) 20%, transparent);
	border-radius: var(--border-radius-md);
`;

const Legend = styled.legend`
	padding: 0 var(--spacing-xs);
	font: var(--font-display-xs);
	letter-spacing: 0.08em;
	color: var(--color-primary-accent);
	text-transform: capitalize;
`;

const Row = styled.label`
	display: grid;
	grid-template-columns: 4rem 1fr 5rem;
	align-items: center;
	gap: var(--spacing-sm);
	font-size: var(--font-size-legal);
`;

const Buttons = styled.div`
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing-xs);
`;

/** Where the catch is taken from when previewing, metres — deep enough that the haul has somewhere to come from. */
const PREVIEW_CATCH_M = 3000;
/** The fish hung when none is bet on. */
const DEFAULT_FISH = "bluefin-tuna";

/** Index into `world` of the first fish bet on, else the first tuna. */
function previewFish(world: Sim["world"]): number {
	const bet = Object.keys(useBetStore.getState().bets).find(key => key.startsWith("fish:"));
	const bound = bet ? world.findIndex(fish => fish.id === bet.slice("fish:".length)) : -1;
	return bound >= 0 ? bound : world.findIndex(fish => fish.id === DEFAULT_FISH);
}

const STAGE_LABELS = {
	haul: "Haul",
	rod: "Rod",
	crane: "Crane",
	helicopter: "Helicopter",
	chinook: "Chinook",
	hold: "Hold"
};

/** `[stage, first tick]` for every stage of this catch's landing, in order. */
function stageStarts(multiplier: number): [string, number][] {
	const gears = gearsFor(multiplier);
	const starts: [string, number][] = [];
	for (let tick = 0; tick <= extractionTicks(gears, PREVIEW_CATCH_M); tick++) {
		const { stage } = extractionAt(gears, PREVIEW_CATCH_M, tick);
		if (starts.at(-1)?.[0] !== stage) starts.push([stage, tick]);
	}
	return starts;
}

/** Parks a fabricated run mid-landing, so any moment of the extraction can be looked at without playing a run. */
function previewExtraction(multiplier: number, tick: number) {
	const sim = createSim(useHookStore.getState().worldSeed, multiplier);
	const elapsed = extractionAt(gearsFor(multiplier), PREVIEW_CATCH_M, tick);
	useHookStore.setState({
		sim: {
			...sim,
			phase: "extract",
			tick,
			phaseTick: 0,
			catchM: PREVIEW_CATCH_M,
			depthM: elapsed.depthM,
			hooked: previewFish(sim.world),
			hookedTick: 0
		}
	});
}

const round = (n: number) => Math.round(n * 10000) / 10000;

/** Which breakpoint the window is at right now — same one `layoutTweak` would resolve to for this view, so
 *  "Copy layout" always bakes into the bucket you're actually looking at. */
const currentBreakpoint = () => viewBreakpoint({ width: window.innerWidth, height: window.innerHeight });

/** `HARBOUR_LAYOUT` with the current breakpoint's bucket plus every current debug tweak folded in, in the
 *  same px-to-share units `HARBOUR_LAYOUT` already uses — ready to paste over that object with no further
 *  conversion. The other two breakpoints pass through unchanged. */
function bakedLayout(): typeof HARBOUR_LAYOUT {
	const view = { width: window.innerWidth, height: window.innerHeight };
	const { tweaks } = useHarbourDebugStore.getState();
	const tuned = Object.fromEntries(
		TWEAK_KEYS.map(key => {
			const base = HARBOUR_LAYOUT[currentBreakpoint()][key];
			const tweak = tweaks[key];
			return [
				key,
				{
					x: round(base.x + tweak.x / view.width),
					y: round(base.y + tweak.y / view.height),
					scale: round(base.scale * tweak.scale)
				}
			];
		})
	) as Record<TweakKey, Tweak>;
	return { ...HARBOUR_LAYOUT, [currentBreakpoint()]: tuned };
}

/** Copies `bakedLayout()` to the clipboard as the full `HARBOUR_LAYOUT` declaration, `;` included, so it
 *  pastes over the existing statement cleanly. */
function copyLayout() {
	const layout = bakedLayout();
	const body = (Object.keys(layout) as (keyof typeof layout)[])
		.map(breakpoint => {
			const row = TWEAK_KEYS.map(key => {
				const { x, y, scale } = layout[breakpoint][key];
				return `\t\t${key}: { x: ${x}, y: ${y}, scale: ${scale} }`;
			}).join(",\n");
			return `\t${breakpoint}: {\n${row}\n\t}`;
		})
		.join(",\n");
	navigator.clipboard.writeText(`${body}`);
}

function TweakGroup({ name }: { name: TweakKey }) {
	const tweak = useHarbourDebugStore(state => state.tweaks[name]);
	const setTweak = useHarbourDebugStore(state => state.setTweak);
	// The water and its line only move up and down.
	const yOnly = name === "water" || name === "waterline";
	const sliders = [
		{ key: "x", min: -1500, max: 1500, step: 1 },
		{ key: "y", min: -1500, max: 1500, step: 1 },
		{ key: "scale", min: 0.1, max: 3, step: 0.01 }
	] as const;

	return (
		<Group>
			<Legend>{name}</Legend>
			{sliders
				.filter(({ key }) => !yOnly || key === "y")
				.map(({ key, ...range }) => (
					<Row key={key}>
						{key}
						<input
							{...range}
							type="range"
							value={tweak[key]}
							onChange={e => setTweak(name, { [key]: Number(e.target.value) })}
						/>
						<input
							{...range}
							type="number"
							value={tweak[key]}
							onChange={e => setTweak(name, { [key]: Number(e.target.value) })}
						/>
					</Row>
				))}
		</Group>
	);
}

/**
 * Dev-only HARBOUR button next to DEBUG: sliders to move (px) and resize (×) the background, player, crane,
 * helicopter and hooked fish, and a scrubber that parks a fabricated landing at any moment of it — at the
 * Catch multiplier set in DEBUG's Hook control. The nudges are kept across reloads.
 */
export function HarbourDebug() {
	const [open, setOpen] = useState(false);
	const reset = useHarbourDebugStore(state => state.reset);
	const multiplier = useHookStore(state => state.multiplier);
	const sim = useHookStore(state => state.sim);
	const total = extractionTicks(gearsFor(multiplier), PREVIEW_CATCH_M);
	const previewing = sim?.phase === "extract" && sim.catchM === PREVIEW_CATCH_M;

	return (
		<>
			<Trigger type="button" onClick={() => setOpen(!open)}>
				HARBOUR
			</Trigger>

			<Panel open={open}>
				<Header>
					<b>Harbour — {currentBreakpoint()}</b>
					<Buttons>
						<Button variant="secondary" onClick={copyLayout}>
							Copy layout
						</Button>
						<Button variant="secondary" onClick={reset}>
							Reset
						</Button>
						<Button variant="secondary" onClick={() => setOpen(false)}>
							Close
						</Button>
					</Buttons>
				</Header>

				<Group>
					<Legend>Extraction ×{multiplier}</Legend>
					<Buttons>
						{stageStarts(multiplier).map(([stage, tick]) => (
							<Button key={stage} variant="secondary" onClick={() => previewExtraction(multiplier, tick)}>
								{STAGE_LABELS[stage as keyof typeof STAGE_LABELS]}
							</Button>
						))}
						<Button
							variant="secondary"
							disabled={!previewing}
							onClick={() => useHookStore.setState({ sim: undefined })}
						>
							Clear
						</Button>
					</Buttons>
					<Row>
						tick
						<input
							type="range"
							min={0}
							max={total}
							value={previewing ? sim.tick : 0}
							onChange={e => previewExtraction(multiplier, Number(e.target.value))}
						/>
						{previewing ? sim.tick : "–"}
					</Row>
				</Group>

				{TWEAK_KEYS.map(key => (
					<TweakGroup key={key} name={key} />
				))}
			</Panel>
		</>
	);
}
