import { expect, it } from "vitest";

import { DEPTH_ZONES } from "@constants/depthZones";

import { HOOKABLE_BY_ID } from "./fish";

const zoneStart = (id: string) => DEPTH_ZONES.find(zone => zone.id === id)!.fromMeters;

it("puts the lanternfish and whale in the trench, above the jackpot layer", () => {
	for (const id of ["lanternfish", "whale"]) {
		const { fromMeters, toMeters } = HOOKABLE_BY_ID.get(id)!;
		expect(fromMeters).toBeGreaterThanOrEqual(zoneStart("trench"));
		expect(toMeters).toBeLessThan(zoneStart("jackpot"));
	}
});
