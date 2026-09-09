import { useEffect, useState } from "react";

import background from "@/assets/loading/background.svg";
import logo from "@/assets/loading/logo.svg";

import styles from "./LoadingScreen.module.css";

/**
 * The game's initial presentation (BUILD_PLAN §5.1): full-bleed background,
 * Hooked logo, a spinner, and a percentage progress bar.
 *
 * HTML overlay: a sibling of <Application>, never a child of it (§38). It
 * covers the canvas while the `loading` phase is active and unmounts when
 * the phase machine advances.
 */
function LoadingScreen() {
	const progress = useFakeProgress();
	const pct = Math.round(progress);

	return (
		<div className={styles.screen}>
			<img className={styles.background} src={background} alt="" />

			<img className={styles.logo} src={logo} alt="Hooked" />

			<div className={styles.panel}>
				<span className={styles.spinner} role="status" aria-label="Loading" />
				<div className={styles.bar}>
					<div className={styles.fill} style={{ width: `${pct}%` }} />
				</div>
				<span className={styles.percent}>{pct}%</span>
			</div>
		</div>
	);
}

/**
 * Placeholder load progress for the §5.1 visual.
 *
 * ponytail: fake ramp — §5.2 ("Load required assets") replaces this with a
 * `progress` prop fed by `Assets.load`'s `onProgress`, and this hook is deleted.
 */
function useFakeProgress() {
	const [progress, setProgress] = useState(0);

	useEffect(() => {
		const id = setInterval(() => {
			setProgress(p => {
				if (p >= 100) {
					clearInterval(id);
					return 100;
				}
				return Math.min(100, p + Math.random() * 16 + 5);
			});
		}, 140);
		return () => clearInterval(id);
	}, []);

	return progress;
}

export default LoadingScreen;
