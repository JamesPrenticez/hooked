import { useEffect, useRef, useState } from "react";

import { Button } from "@hooked-ui";
import { useDebugStore } from "@stores/debugStore";

import styles from "./DebugPanel.module.css";

/**
 * Dev-only DEBUG button (bottom-right, every phase) opening a modal of
 * debug categories. Only "Environment" exists so far — day/night time of
 * day and a freeze toggle. More categories land here as they're built.
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

	useEffect(() => {
		if (open) dialogRef.current?.showModal();
		else dialogRef.current?.close();
	}, [open]);

	return (
		<>
			<button type="button" className={styles.trigger} onClick={() => setOpen(true)}>
				DEBUG
			</button>

			<dialog ref={dialogRef} className={styles.modal} onClose={() => setOpen(false)}>
				<div className={styles.header}>
					<h2 className={styles.title}>Debug</h2>
					<Button variant="secondary" onClick={() => setOpen(false)}>
						Close
					</Button>
				</div>

				<section className={styles.category}>
					<h3 className={styles.categoryTitle}>Environment</h3>

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

					<label className={styles.field}>
						<input type="checkbox" checked={frozen} onChange={e => setFrozen(e.target.checked)} />
						Freeze cycle (stop looping)
					</label>
				</section>
			</dialog>
		</>
	);
}

export default DebugPanel;
