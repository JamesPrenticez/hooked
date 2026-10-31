import { expect, it } from "vitest";

import { DEPTH_ZONES, MAX_DEPTH_METERS as LIVE_MAX, PX_PER_METER as LIVE_PX } from "@constants/depthZones";
import { KRAKEN_FIGHT_SECONDS, KRAKEN_HOOKED_SECONDS, KRAKEN_SWIM_SECONDS } from "@constants/krakenAnimations";

import {
	KRAKEN_FIGHT_TICKS,
	KRAKEN_HOOKED_TICKS,
	KRAKEN_SWIM_TICKS,
	MAX_DEPTH_METERS,
	PX_PER_METER,
	TICK_HZ,
	ZONES
} from "./simConfig";

// A retune of the auto descent must not silently change what a stored recording means.
it("matches the live auto-descent numbers", () => {
	expect(ZONES.map(({ id, fromMeters }) => ({ id, fromMeters }))).toEqual(
		DEPTH_ZONES.map(zone => ({ id: zone.id, fromMeters: zone.fromMeters }))
	);
	expect(MAX_DEPTH_METERS).toBe(LIVE_MAX);
	expect(PX_PER_METER).toBe(LIVE_PX);
	expect(KRAKEN_FIGHT_TICKS).toBe(KRAKEN_FIGHT_SECONDS * TICK_HZ);
	expect(KRAKEN_SWIM_TICKS).toBe(KRAKEN_SWIM_SECONDS * TICK_HZ);
	expect(KRAKEN_HOOKED_TICKS).toBe(KRAKEN_HOOKED_SECONDS * TICK_HZ);
});
