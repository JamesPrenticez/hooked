import { describe, expect, it } from "vitest";

import { DEPTH_ZONES, zoneForDepth } from "./depthZones";

describe("zoneForDepth", () => {
	it("is shallow at the surface", () => {
		expect(zoneForDepth(0).id).toBe("shallow");
		expect(zoneForDepth(DEPTH_ZONES[1].fromMeters - 1).id).toBe("shallow");
	});

	it("switches zones exactly at each boundary", () => {
		for (const zone of DEPTH_ZONES) {
			expect(zoneForDepth(zone.fromMeters).id).toBe(zone.id);
		}
	});

	it("stays jackpot arbitrarily deep", () => {
		expect(zoneForDepth(1_000_000).id).toBe("jackpot");
	});
});
