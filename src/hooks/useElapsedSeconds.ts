import { useEffect, useState } from "react";

/**
 * Wall-clock seconds since mount, advancing on `requestAnimationFrame`.
 * For real-time effects (e.g. window-light flicker) that need a live clock
 * but can't call `performance.now()` directly during render — see
 * `react-hooks/purity`.
 */
export function useElapsedSeconds(): number {
	const [seconds, setSeconds] = useState(0);

	useEffect(() => {
		const start = performance.now();
		let frame = requestAnimationFrame(function tick() {
			setSeconds((performance.now() - start) / 1000);
			frame = requestAnimationFrame(tick);
		});
		return () => cancelAnimationFrame(frame);
	}, []);

	return seconds;
}
