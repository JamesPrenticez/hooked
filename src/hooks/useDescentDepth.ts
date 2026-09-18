import { useEffect, useRef, useState } from "react";

import { MAX_DEPTH_METERS, zoneForDepth } from "@constants/depthZones";
import { useDebugStore } from "@stores/debugStore";

// Final fraction of the descent that decelerates to a stop at MAX_DEPTH_METERS,
// on top of whatever speed the current tier is set to.
const DECEL_FRACTION = 0.1;
// Never crawl slower than this while still descending — the deceleration
// only eases off below the tier's own speed, it doesn't grind to a near-halt.
const MIN_DESCENT_METERS_PER_SECOND = 25;
// Fixed speed for the "reel back in" leg — not a per-tier debug control, just
// enough to sell the return without a second full descent's wait.
const ASCEND_METERS_PER_SECOND = 600;
// How long the hook holds at the bottom before heading back up.
const BOTTOM_HOLD_SECONDS = 1;

type Phase = "down" | "bottom" | "up";

/**
 * Depth (metres) below the boat since the descent started, advancing on
 * `requestAnimationFrame` while `active`. Speed is read live from the debug
 * store's per-tier `zoneSpeeds`/`depthZones` (BUILD_PLAN §13), decelerating
 * over the final `DECEL_FRACTION` of the range so the hook slows to a stop
 * at `MAX_DEPTH_METERS` instead of snapping to it. Once it bottoms out it
 * holds briefly, then reels back to the surface and calls `onSurfaced` —
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

				const decelStart = MAX_DEPTH_METERS * (1 - DECEL_FRACTION);
				const factor =
					current > decelStart ? Math.max(0, (MAX_DEPTH_METERS - current) / (MAX_DEPTH_METERS - decelStart)) : 1;
				const effectiveSpeed = Math.max(speed * factor, Math.min(speed, MIN_DESCENT_METERS_PER_SECOND));

				current = Math.min(MAX_DEPTH_METERS, current + effectiveSpeed * dt);
				if (current >= MAX_DEPTH_METERS) phase = "bottom";
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
