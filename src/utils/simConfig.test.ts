import { expect, it } from "vitest";

import { DEPTH_ZONES, MAX_DEPTH_METERS as LIVE_MAX, PX_PER_METER as LIVE_PX } from "@constants/depthZones";
import { DECEL_FRACTION as LIVE_DECEL, MIN_DESCENT_METERS_PER_SECOND as LIVE_MIN } from "@hooks/useDescentDepth";
import { useDebugStore } from "@stores/debugStore";

import { DECEL_FRACTION, MAX_DEPTH_METERS, MIN_DESCENT_METERS_PER_SECOND, PX_PER_METER, ZONES } from "./simConfig";

// A retune of the auto descent must not silently change what a stored recording means.
it("matches the live auto-descent numbers", () => {
	const { zoneSpeeds } = useDebugStore.getState();
	expect(ZONES.map(({ id, fromMeters, speed }) => ({ id, fromMeters, speed }))).toEqual(
		DEPTH_ZONES.map(zone => ({
			id: zone.id,
			fromMeters: zone.fromMeters,
			speed: zoneSpeeds[zone.id]
		}))
	);
	expect(MAX_DEPTH_METERS).toBe(LIVE_MAX);
	expect(PX_PER_METER).toBe(LIVE_PX);
	expect(DECEL_FRACTION).toBe(LIVE_DECEL);
	expect(MIN_DESCENT_METERS_PER_SECOND).toBe(LIVE_MIN);
});
