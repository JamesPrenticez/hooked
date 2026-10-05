import { useEffect, useRef, useState } from "react";
import styled from "styled-components";

import { getRecording, listRecordings, saveRecording, verifyRecording } from "@api";
import { MAX_DEPTH_METERS, metersToFeet } from "@constants/depthZones";
import { KRAKEN_SHEETS } from "@constants/krakenAnimations";
import { PLAYER_ANIMATION_NAMES, PLAYER_ANIMATIONS } from "@constants/playerAnimations";
import { Accordion, Button, Overlay } from "@hooked-ui";
import { useDebugStore } from "@stores/debugStore";
import { type HookMode, TIME_SCALES, useHookStore } from "@stores/hookStore";
import { useKrakenStore } from "@stores/krakenStore";
import { usePlayerStore } from "@stores/playerStore";
import type { StoredRecording } from "@type/api";
import {
	CHINOOK_FROM,
	CRANE_FROM,
	extractionAt,
	gearsFor,
	HELICOPTER_FROM,
	MAX_MULTIPLIER,
	MIN_MULTIPLIER
} from "@utils/simExtraction";
import { fromBase64, type Recording } from "@utils/simRecording";

/** The multipliers worth jumping straight to: a plain reel-in, a crane catch and a helicopter catch. */
const MULTIPLIER_PRESETS = [MIN_MULTIPLIER, CRANE_FROM, HELICOPTER_FROM, CHINOOK_FROM, MAX_MULTIPLIER];

const Modal = styled.dialog`
	width: min(90vw, 42rem);
	margin: auto;
	padding: 2rem;
	border: none;
	border-radius: 1.2rem;
	background: var(--color-black);
	color: var(--color-white);

	&::backdrop {
		background: color-mix(in srgb, var(--color-black) 20%, transparent);
	}
`;

const Header = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: var(--spacing-md);
`;

const Actions = styled.div`
	display: flex;
	gap: var(--spacing-sm);
`;

const Title = styled.h2`
	font: var(--font-display-sm);
`;

const Fields = styled.div`
	display: flex;
	flex-direction: column;
	gap: 1.4rem;
`;

const Field = styled.label`
	display: flex;
	flex: 1;
	flex-direction: column;
	gap: 0.6rem;
	font-family: var(--font-text);
	font-weight: 600;
	font-size: 1.2rem;
	text-transform: uppercase;
`;

const CheckField = styled.label`
	display: flex;
	align-items: center;
	gap: var(--spacing-sm);
	font-size: var(--font-size-legal);
`;

const Note = styled.p`
	font-size: var(--font-size-legal);
`;

const Zone = styled.fieldset`
	display: flex;
	gap: 1.2rem;
	margin: 0;
	padding: var(--spacing-sm) 1.2rem 1.2rem;
	border: 1px solid color-mix(in srgb, var(--color-white) 20%, transparent);
	border-radius: var(--border-radius-md);
`;

const Sheet = styled(Zone)`
	display: block;
`;

const ZoneLabel = styled.legend`
	padding: 0 var(--spacing-xs);
	font: var(--font-display-xs);
	letter-spacing: 0.08em;
	color: var(--color-primary-accent);
`;

const Animations = styled.div`
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
	gap: var(--spacing-sm);
`;

const AnimationButton = styled(Button)`
	padding: 0.8rem 1rem;
	font-size: 1.3rem;
	text-transform: capitalize;
`;

export const DebugModal = () => {
	const dialogRef = useRef<HTMLDialogElement>(null);
	const isDebugOpen = useDebugStore(state => state.isDebugOpen);
	const setIsDebugOpen = useDebugStore(state => state.setIsDebugOpen);
	const frozen = useDebugStore(state => state.frozen);
	const setFrozen = useDebugStore(state => state.setFrozen);
	const timeOfDay = useDebugStore(state => state.timeOfDay);
	const setTimeOfDay = useDebugStore(state => state.setTimeOfDay);

	const depthUnit = useDebugStore(state => state.depthUnit);
	const setDepthUnit = useDebugStore(state => state.setDepthUnit);
	const depthZones = useDebugStore(state => state.depthZones);
	const zoneSpeeds = useDebugStore(state => state.zoneSpeeds);
	const setZoneFromMeters = useDebugStore(state => state.setZoneFromMeters);
	const setZoneSpeed = useDebugStore(state => state.setZoneSpeed);
	const resetDefaults = useDebugStore(state => state.resetDefaults);

	const hookMode = useHookStore(state => state.hookMode);
	const setHookMode = useHookStore(state => state.setHookMode);
	const worldSeed = useHookStore(state => state.worldSeed);
	const setWorldSeed = useHookStore(state => state.setWorldSeed);
	const multiplier = useHookStore(state => state.multiplier);
	const setMultiplier = useHookStore(state => state.setMultiplier);
	const timeScale = useHookStore(state => state.timeScale);
	const setTimeScale = useHookStore(state => state.setTimeScale);
	const showHitboxes = useHookStore(state => state.showHitboxes);
	const setShowHitboxes = useHookStore(state => state.setShowHitboxes);
	const sim = useHookStore(state => state.sim);
	const recording = useHookStore(state => state.recording);
	// Keyed to the run it is about, so a new run doesn't show the last one's outcome.
	const [saved, setSaved] = useState<{ of: Recording; text: string }>();

	const playAnimation = usePlayerStore(state => state.play);

	const forceTrench = useKrakenStore(state => state.forceTrench);
	const setForceTrench = useKrakenStore(state => state.setForceTrench);
	const playKraken = useKrakenStore(state => state.play);

	async function saveRun() {
		if (!recording) return;
		let text: string;
		try {
			const run = await saveRecording(recording);
			text = `Saved #${run.id}: ${run.fish} (${run.depth})${run.duplicate ? " — already in the library" : ""}`;
		} catch (err) {
			text = `Save failed: ${err instanceof Error ? err.message : "unknown error"}`;
		}
		setSaved({ of: recording, text });
	}

	useEffect(() => {
		if (isDebugOpen) dialogRef.current?.showModal();
		else dialogRef.current?.close();
	}, [isDebugOpen]);

	return (
		<Overlay>
			<Modal ref={dialogRef} onClose={() => setIsDebugOpen(false)}>
				<Header>
					<Title>Debug</Title>
					<Actions>
						<Button variant="secondary" onClick={resetDefaults}>
							Reset defaults
						</Button>
						<Button variant="secondary" onClick={() => setIsDebugOpen(false)}>
							Close
						</Button>
					</Actions>
				</Header>

				<Accordion title="Environment" theme="dark" open>
					<Fields>
						<Field>
							Time of day
							<input
								type="range"
								min={0}
								max={1}
								step={0.01}
								value={timeOfDay}
								onChange={e => setTimeOfDay(Number(e.target.value))}
							/>
						</Field>

						<CheckField>
							<input type="checkbox" checked={frozen} onChange={e => setFrozen(e.target.checked)} />
							Freeze cycle (stop looping)
						</CheckField>
					</Fields>
				</Accordion>

				<Accordion title="Hook" theme="dark">
					<Fields>
						<Field>
							Display unit
							<select value={depthUnit} onChange={e => setDepthUnit(e.target.value as "m" | "ft")}>
								<option value="m">Metres</option>
								<option value="ft">Feet</option>
							</select>
						</Field>

						<Note>
							Max depth: {Math.round(metersToFeet(MAX_DEPTH_METERS)).toLocaleString()}ft /{" "}
							{MAX_DEPTH_METERS.toLocaleString()}m
						</Note>

						{depthZones.map(zone => (
							<Zone key={zone.id}>
								<ZoneLabel>{zone.label}</ZoneLabel>
								<Field>
									Starts at (m)
									<input
										type="number"
										min={0}
										max={MAX_DEPTH_METERS}
										value={Math.round(zone.fromMeters)}
										onChange={e => setZoneFromMeters(zone.id, Number(e.target.value))}
									/>
								</Field>
								<Field>
									Speed (m/s)
									<input
										type="number"
										min={0}
										value={zoneSpeeds[zone.id]}
										onChange={e => setZoneSpeed(zone.id, Number(e.target.value))}
									/>
								</Field>
							</Zone>
						))}
					</Fields>
				</Accordion>

				<Accordion title="Hook control" theme="dark">
					<Fields>
						<Field>
							Mode
							<select value={hookMode} onChange={e => setHookMode(e.target.value as HookMode)}>
								<option value="auto">Auto (scripted descent)</option>
								<option value="manual">Manual (← / → keys)</option>
								<option value="replay">Replay (from Recordings)</option>
							</select>
						</Field>
						<Field>
							Seed
							<input
								type="number"
								min={0}
								step={1}
								value={worldSeed}
								onChange={e => setWorldSeed(Number(e.target.value) >>> 0)}
							/>
						</Field>
						<Field>
							Catch multiplier
							<input
								type="number"
								min={MIN_MULTIPLIER}
								max={MAX_MULTIPLIER}
								step={1}
								value={multiplier}
								onChange={e =>
									setMultiplier(
										Math.min(
											MAX_MULTIPLIER,
											Math.max(MIN_MULTIPLIER, Math.round(Number(e.target.value)) || MIN_MULTIPLIER)
										)
									)
								}
							/>
						</Field>
						<Actions>
							{MULTIPLIER_PRESETS.map(preset => (
								<Button key={preset} variant="secondary" onClick={() => setMultiplier(preset)}>
									{preset}×
								</Button>
							))}
						</Actions>
						<Note>
							How heavy the next catch is: from {CRANE_FROM}× the crane is called in, from {HELICOPTER_FROM}× the
							helicopter too, from {CHINOOK_FROM}× the Chinook — and the fish comes out of the water bigger. Applies to
							the next Cast.
						</Note>
						<Field>
							Speed
							<select value={timeScale} onChange={e => setTimeScale(Number(e.target.value))}>
								{TIME_SCALES.map(scale => (
									<option key={scale} value={scale}>
										×{scale}
									</option>
								))}
							</select>
						</Field>
						<CheckField>
							<input type="checkbox" checked={showHitboxes} onChange={e => setShowHitboxes(e.target.checked)} />
							Show hit-boxes
						</CheckField>
						<Note>Manual: Cast Line, then steer with ← / →. The "Hook" speeds above drive Auto only.</Note>
						<Note data-testid="hook-readout">
							{sim
								? `${sim.phase}${sim.phase === "extract" ? `:${extractionAt(gearsFor(sim.multiplier), sim.catchM, sim.tick - sim.phaseTick).stage}` : ""} · x ${Math.round(sim.x)} · ${Math.round(sim.depthM).toLocaleString()}m · tick ${sim.tick} · ×${sim.multiplier} · hooked ${sim.world[sim.hooked]?.id ?? "none"}`
								: "no run"}
						</Note>
						<Actions>
							<Button variant="secondary" disabled={!recording} onClick={saveRun}>
								Save run
							</Button>
						</Actions>
						<Note data-testid="save-status">
							{saved && saved.of === recording ? saved.text : "Finish a run, then save it to the recording library."}
						</Note>
					</Fields>
				</Accordion>

				<Accordion title="Recordings" theme="dark">
					<RecordingsList />
				</Accordion>

				<Accordion title="Player" theme="dark">
					<Animations>
						{PLAYER_ANIMATION_NAMES.map(name => (
							<AnimationButton
								key={name}
								variant="secondary"
								title={PLAYER_ANIMATIONS[name].description}
								onClick={() => playAnimation(name)}
							>
								{name.replaceAll("_", " ")}
							</AnimationButton>
						))}
					</Animations>
				</Accordion>

				<Accordion title="Kraken" theme="dark">
					<Fields>
						<CheckField>
							<input type="checkbox" checked={forceTrench} onChange={e => setForceTrench(e.target.checked)} />
							Force hook to the trench
						</CheckField>
						<Note>
							Jumps straight to the max depth and holds there — that's where the Kraken appears. Untick it (or hit
							Surface) to go back to the harbour.
						</Note>

						{KRAKEN_SHEETS.map(sheet => (
							<Sheet key={sheet.id}>
								<ZoneLabel>{sheet.label}</ZoneLabel>
								<Animations>
									{sheet.animations.map(animation => (
										<AnimationButton
											key={animation.id}
											variant="secondary"
											title={animation.description}
											onClick={() => playKraken(animation.id)}
										>
											{animation.name.replaceAll("_", " ")}
										</AnimationButton>
									))}
								</Animations>
							</Sheet>
						))}
					</Fields>
				</Accordion>
			</Modal>
		</Overlay>
	);
};

/** The recording library: play a stored run through the sim, or ask the server to re-verify it. */
function RecordingsList() {
	const [recordings, setRecordings] = useState<StoredRecording[]>();
	const [status, setStatus] = useState("Load the library to play a stored run.");
	const setHookMode = useHookStore(state => state.setHookMode);
	const setReplay = useHookStore(state => state.setReplay);

	async function attempt(action: () => Promise<string>) {
		try {
			setStatus(await action());
		} catch (err) {
			setStatus(`Failed: ${err instanceof Error ? err.message : "unknown error"}`);
		}
	}

	const load = () =>
		attempt(async () => {
			const list = await listRecordings();
			setRecordings(list);
			return `${list.length} recording${list.length === 1 ? "" : "s"}`;
		});

	const play = (id: number) =>
		attempt(async () => {
			const { worldSeed, multiplier, inputs, fish } = await getRecording(id);
			setReplay({ worldSeed, multiplier, inputs: fromBase64(inputs) });
			setHookMode("replay");
			return `Replay #${id} loaded (${fish}). Close this and Cast Line.`;
		});

	const verify = (id: number) =>
		attempt(async () => {
			const v = await verifyRecording(id);
			return `#${id}: ${v.ok ? `verified — ${v.fish}` : `MISMATCH (hash ${v.hashMatches}, catch ${v.resultMatches})`}`;
		});

	return (
		<Fields>
			<Actions>
				<Button variant="secondary" onClick={load}>
					{recordings ? "Refresh" : "Load"}
				</Button>
			</Actions>
			{recordings?.map(r => (
				<Actions key={r.id} data-testid="recording-row">
					<Note>
						#{r.id} {r.fish} · seed {r.worldSeed} · ×{r.multiplier} · {r.ticks} ticks
					</Note>
					<Button variant="secondary" onClick={() => play(r.id)}>
						Play
					</Button>
					<Button variant="secondary" onClick={() => verify(r.id)}>
						Verify
					</Button>
				</Actions>
			))}
			<Note data-testid="recordings-status">{status}</Note>
		</Fields>
	);
}
