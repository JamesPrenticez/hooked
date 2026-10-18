import { describe, expect, it } from "vitest";

import { DEPTH_ZONES } from "@constants/depthZones";

import { computeDepthAmbience } from "./depthAmbience";

const [shallow, reef, deep] = DEPTH_ZONES;
const jackpot = DEPTH_ZONES[DEPTH_ZONES.length - 1];

describe("computeDepthAmbience", () => {
	it("is undarkened and shallow at the surface", () => {
		const a = computeDepthAmbience(0);
		expect(a.darkness).toBe(0);
		expect(a.zone.id).toBe("shallow");
	});

	it("darkens as depth increases", () => {
		expect(computeDepthAmbience(deep.fromMeters).darkness).toBeGreaterThan(
			computeDepthAmbience(reef.fromMeters).darkness
		);
	});

	it("fades the caustics out faster than the light shafts", () => {
		const surface = computeDepthAmbience(0);
		const atDeep = computeDepthAmbience(deep.fromMeters);
		expect(surface.caustics).toBe(1);
		expect(surface.shafts).toBe(1);
		expect(atDeep.caustics).toBeLessThan(atDeep.shafts);
		expect(atDeep.shafts).toBeLessThan(1);
	});

	it("holds the jackpot keyframe past its boundary", () => {
		const atBoundary = computeDepthAmbience(jackpot.fromMeters);
		const wayPast = computeDepthAmbience(jackpot.fromMeters + 1_000_000);
		expect(wayPast.darkness).toBe(atBoundary.darkness);
		expect(wayPast.waterTop).toBe(atBoundary.waterTop);
		expect(wayPast.zone.id).toBe("jackpot");
	});

	it("blends halfway between keyframes", () => {
		const midpoint = (shallow.fromMeters + reef.fromMeters) / 2;
		expect(computeDepthAmbience(midpoint).darkness).toBeCloseTo(0.075, 5);
	});
});
