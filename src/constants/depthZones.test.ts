import { describe, expect, it } from "vitest";

import { DEPTH_ZONES, JACKPOT_DEPTH_METERS, KRAKEN_DEPTH_METERS, MAX_DEPTH_METERS, zoneForDepth } from "./depthZones";

describe("the jackpot layer", () => {
	it("starts exactly at the deepest point of the ocean, 10,935m", () => {
		expect(DEPTH_ZONES.find(zone => zone.id === "jackpot")!.fromMeters).toBe(10_935);
		expect(JACKPOT_DEPTH_METERS).toBe(10_935);
	});

	it("is the last zone, with the hook stopping below its line — at the bottom of the world", () => {
		expect(DEPTH_ZONES.at(-1)!.id).toBe("jackpot");
		expect(KRAKEN_DEPTH_METERS).toBeGreaterThan(JACKPOT_DEPTH_METERS);
		expect(KRAKEN_DEPTH_METERS).toBe(MAX_DEPTH_METERS);
	});
});

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
