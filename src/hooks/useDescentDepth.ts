import { useEffect, useRef, useState } from "react";

import { KRAKEN_DEPTH_METERS, zoneForDepth } from "@constants/depthZones";
import { KRAKEN_FIGHT_SECONDS } from "@constants/krakenAnimations";
import { useDebugStore } from "@stores/debugStore";

// Fixed speed for the "reel back in" leg — not a per-tier debug control, just
// enough to sell the return without a second full descent's wait.
const ASCEND_METERS_PER_SECOND = 600;
// How long the hook holds at the bottom before heading back up: the Kraken's
// grab-and-tug fight, which `Kraken` plays off its own clock in step with this.
const BOTTOM_HOLD_SECONDS = KRAKEN_FIGHT_SECONDS;

type Phase = "down" | "bottom" | "up";

/**
 * Depth (metres) below the boat since the descent started, advancing on
 * `requestAnimationFrame` while `active`. Speed is read live from the debug
 * store's per-tier `zoneSpeeds`/`depthZones` (BUILD_PLAN §13). Once it bottoms out it
 * holds for the Kraken fight, then reels back to the surface and calls `onSurfaced` —
 * for now that's the whole round, no fish/target depth yet.
 */
export function useDescentDepth(active: boolean, onSurfaced?: () => void): number {
	const [depth, setDepth] = useState(0);
	const onSurfacedRef = useRef(onSurfaced);
	onSurfacedRef.current = onSurfaced;

	useEffect(() => {
		if (!active) {
			setDepth(0);
			return;
		}

		let phase: Phase = "down";
		let current = 0;
		let bottomElapsed = 0;
		let last = performance.now();

		let frame = requestAnimationFrame(function tick(now) {
			const dt = (now - last) / 1000;
			last = now;

			if (phase === "down") {
				const { depthZones, zoneSpeeds } = useDebugStore.getState();
				const zone = zoneForDepth(current, depthZones);
				const speed = zoneSpeeds[zone.id] ?? 0;

				current = Math.min(KRAKEN_DEPTH_METERS, current + speed * dt);
				if (current >= KRAKEN_DEPTH_METERS) phase = "bottom";
			} else if (phase === "bottom") {
				bottomElapsed += dt;
				if (bottomElapsed >= BOTTOM_HOLD_SECONDS) phase = "up";
			} else {
				current = Math.max(0, current - ASCEND_METERS_PER_SECOND * dt);
				if (current <= 0) {
					setDepth(0);
					onSurfacedRef.current?.();
					return;
				}
			}

			setDepth(current);
			frame = requestAnimationFrame(tick);
		});
		return () => cancelAnimationFrame(frame);
	}, [active]);

	return depth;
}
