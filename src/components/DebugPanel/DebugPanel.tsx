import { useEffect, useRef, useState } from "react";

import { MAX_DEPTH_METERS, metersToFeet } from "@constants/depthZones";
import { KRAKEN_SHEETS } from "@constants/krakenAnimations";
import { PLAYER_ANIMATION_NAMES, PLAYER_ANIMATIONS } from "@constants/playerAnimations";
import { Accordion, Button } from "@hooked-ui";
import { useDebugStore } from "@stores/debugStore";
import { useKrakenStore } from "@stores/krakenStore";
import { usePlayerStore } from "@stores/playerStore";

import styles from "./DebugPanel.module.css";

/**
 * Dev-only DEBUG button (bottom-right, every phase) opening a modal of
 * debug categories: "Environment" (day/night time of day, freeze toggle),
 * "Hook" (per-tier depth range + descent speed, display unit), "Player"
 * (play any of the fisherman's animations) and "Kraken" (park the hook at the
 * trench, play any of the boss's sheet animations). More categories land here
 * as they're built.
 *
 * A native `<dialog>` gets backdrop click-to-close and Escape for free.
 */
function DebugPanel() {
	const dialogRef = useRef<HTMLDialogElement>(null);
	const [open, setOpen] = useState(false);
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

	const playAnimation = usePlayerStore(state => state.play);

	const forceTrench = useKrakenStore(state => state.forceTrench);
	const setForceTrench = useKrakenStore(state => state.setForceTrench);
	const playKraken = useKrakenStore(state => state.play);

	useEffect(() => {
		if (open) dialogRef.current?.showModal();
		else dialogRef.current?.close();
	}, [open]);

	return (
		<>
			<Button type="button" className={styles.trigger} onClick={() => setOpen(true)}>
				DEBUG
			</Button>

			<dialog ref={dialogRef} className={styles.modal} onClose={() => setOpen(false)}>
				<div className={styles.header}>
					<h2 className={styles.title}>Debug</h2>
					<Button variant="secondary" onClick={() => setOpen(false)}>
						Close
					</Button>
				</div>

				<Accordion title="Environment" theme="dark" open>
					<div className={styles.fields}>
						<label className={styles.field}>
							Time of day
							<input
								type="range"
								min={0}
								max={1}
								step={0.01}
								value={timeOfDay}
								onChange={e => setTimeOfDay(Number(e.target.value))}
							/>
						</label>

						<label className={styles.checkField}>
							<input type="checkbox" checked={frozen} onChange={e => setFrozen(e.target.checked)} />
							Freeze cycle (stop looping)
						</label>
					</div>
				</Accordion>

				<Accordion title="Hook" theme="dark">
					<div className={styles.fields}>
						<label className={styles.field}>
							Display unit
							<select value={depthUnit} onChange={e => setDepthUnit(e.target.value as "m" | "ft")}>
								<option value="m">Metres</option>
								<option value="ft">Feet</option>
							</select>
						</label>

						<p className={styles.note}>
							Max depth: {Math.round(metersToFeet(MAX_DEPTH_METERS)).toLocaleString()}ft /{" "}
							{MAX_DEPTH_METERS.toLocaleString()}m
						</p>

						{depthZones.map(zone => (
							<fieldset key={zone.id} className={styles.zone}>
								<legend className={styles.zoneLabel}>{zone.label}</legend>
								<label className={styles.field}>
									Starts at (m)
									<input
										type="number"
										min={0}
										max={MAX_DEPTH_METERS}
										value={Math.round(zone.fromMeters)}
										onChange={e => setZoneFromMeters(zone.id, Number(e.target.value))}
									/>
								</label>
								<label className={styles.field}>
									Speed (m/s)
									<input
										type="number"
										min={0}
										value={zoneSpeeds[zone.id]}
										onChange={e => setZoneSpeed(zone.id, Number(e.target.value))}
									/>
								</label>
							</fieldset>
						))}
					</div>
				</Accordion>

				<Accordion title="Player" theme="dark">
					<div className={styles.animations}>
						{PLAYER_ANIMATION_NAMES.map(name => (
							<Button
								key={name}
								variant="secondary"
								className={styles.animation}
								title={PLAYER_ANIMATIONS[name].description}
								onClick={() => playAnimation(name)}
							>
								{name.replaceAll("_", " ")}
							</Button>
						))}
					</div>
				</Accordion>

				<Accordion title="Kraken" theme="dark">
					<div className={styles.fields}>
						<label className={styles.checkField}>
							<input type="checkbox" checked={forceTrench} onChange={e => setForceTrench(e.target.checked)} />
							Force hook to the trench
						</label>
						<p className={styles.note}>
							Jumps straight to the max depth and holds there — that's where the Kraken appears. Untick it (or hit
							Surface) to go back to the harbour.
						</p>

						{KRAKEN_SHEETS.map(sheet => (
							<fieldset key={sheet.id} className={styles.sheet}>
								<legend className={styles.zoneLabel}>{sheet.label}</legend>
								<div className={styles.animations}>
									{sheet.animations.map(animation => (
										<Button
											key={animation.id}
											variant="secondary"
											className={styles.animation}
											title={animation.description}
											onClick={() => playKraken(animation.id)}
										>
											{animation.name.replaceAll("_", " ")}
										</Button>
									))}
								</div>
							</fieldset>
						))}
					</div>
				</Accordion>
			</dialog>
		</>
	);
}

export default DebugPanel;
