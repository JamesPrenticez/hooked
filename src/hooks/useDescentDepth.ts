import { useEffect, useState } from "react";

// ponytail: placeholder pace, not tied to a server-selected target depth yet
// (BUILD_PLAN §13) — just fast enough to see every zone within a demo click.
const METERS_PER_SECOND = 220;

/**
 * Depth (metres) below the boat since the descent started, advancing on
 * `requestAnimationFrame` while `active` and resetting to 0 the moment it
 * isn't — mirrors `useElapsedSeconds`, scoped to one dive.
 */
export function useDescentDepth(active: boolean): number {
	const [depth, setDepth] = useState(0);

	useEffect(() => {
		if (!active) {
			setDepth(0);
			return;
		}

		const start = performance.now();
		let frame = requestAnimationFrame(function tick(now) {
			setDepth(((now - start) / 1000) * METERS_PER_SECOND);
			frame = requestAnimationFrame(tick);
		});
		return () => cancelAnimationFrame(frame);
	}, [active]);

	return depth;
}
