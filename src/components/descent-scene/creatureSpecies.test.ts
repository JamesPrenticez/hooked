import { describe, expect, it } from "vitest";

import { DEPTH_ZONES } from "@constants/depthZones";

import { CREATURES, spawnCreatures, SPECIES } from "./creatureSpecies";

const zoneStart = (id: string) => DEPTH_ZONES.find(zone => zone.id === id)!.fromMeters;

describe("spawnCreatures", () => {
	it("spawns each species' count, several of a kind", () => {
		for (const s of SPECIES) expect(CREATURES.filter(c => c.species === s)).toHaveLength(s.count);
		expect(SPECIES.every(s => s.count > 1)).toBe(true);
	});

	it("keeps every fish inside its species' depth band", () => {
		for (const c of CREATURES) {
			expect(c.meters).toBeGreaterThanOrEqual(c.species.fromMeters);
			expect(c.meters).toBeLessThanOrEqual(c.species.toMeters);
		}
	});

	it("is deterministic for a seed and varies across seeds", () => {
		expect(spawnCreatures(SPECIES, 1)).toEqual(spawnCreatures(SPECIES, 1));
		expect(spawnCreatures(SPECIES, 2)).not.toEqual(spawnCreatures(SPECIES, 1));
	});

	it("puts the lanternfish and whale in the trench, above the jackpot layer", () => {
		for (const c of CREATURES.filter(c => c.species.url.includes("lantern") || c.species.url.includes("whale"))) {
			expect(c.meters).toBeGreaterThanOrEqual(zoneStart("trench"));
			expect(c.meters).toBeLessThan(zoneStart("jackpot"));
		}
	});
});
