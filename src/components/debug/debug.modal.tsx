import { useState } from "react";
import styled from "styled-components";

import { getRecording, listRecordings, saveRecording, verifyRecording } from "@api";
import { Accordion, Button, Overlay } from "@hooked-ui";
import { Modal } from "@hooked-ui/modal";
import { useDebugStore } from "@stores/debugStore";
import { useHookStore } from "@stores/hookStore";
import type { StoredRecording } from "@type/api";
import { CHINOOK_FROM, CRANE_FROM, HELICOPTER_FROM, MAX_MULTIPLIER, MIN_MULTIPLIER } from "@utils/simExtraction";
import { fromBase64, type Recording } from "@utils/simRecording";

/** The multipliers worth jumping straight to: a plain reel-in, a crane catch and a helicopter catch. */
const MULTIPLIER_PRESETS = [MIN_MULTIPLIER, CRANE_FROM, HELICOPTER_FROM, CHINOOK_FROM, MAX_MULTIPLIER];

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

const Note = styled.p`
	font-size: var(--font-size-legal);
`;

export const DebugModal = () => {
	const isDebugOpen = useDebugStore(state => state.isDebugOpen);
	const setIsDebugOpen = useDebugStore(state => state.setIsDebugOpen);
	const multiplier = useHookStore(state => state.multiplier);
	const setMultiplier = useHookStore(state => state.setMultiplier);
	const recording = useHookStore(state => state.recording);
	// Keyed to the run it is about, so a new run doesn't show the last one's outcome.
	const [saved, setSaved] = useState<{ of: Recording; text: string }>();

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

	if (!isDebugOpen) return null;

	return (
		<Overlay onClick={() => setIsDebugOpen(false)}>
			<Modal>
				<Header>
					<Title>Debug</Title>
					<Actions>
						<Button variant="secondary" onClick={() => setIsDebugOpen(false)}>
							Close
						</Button>
					</Actions>
				</Header>

				<Accordion title="Multipliers" theme="dark">
					<Fields>
						<Field>
							Catch multiplier
							<input
								type="number"
								min={MIN_MULTIPLIER}
								max={MAX_MULTIPLIER}
								step={1}
								value={multiplier ?? MIN_MULTIPLIER}
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
					</Fields>
				</Accordion>

				<Accordion title="Recordings" theme="dark">
					<Fields>
						<Actions>
							<Button variant="secondary" disabled={!recording} onClick={saveRun}>
								Save run
							</Button>
						</Actions>
						<Note data-testid="save-status">
							{saved && saved.of === recording ? saved.text : "Finish a run, then save it to the recording library."}
						</Note>
						<RecordingsList />
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
