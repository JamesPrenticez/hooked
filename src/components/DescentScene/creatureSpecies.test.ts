import { describe, expect, it } from "vitest";

import { CREATURES, spawnCreatures, SPECIES } from "./creatureSpecies";

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

	it("leaves the trench clear for the Kraken", () => {
		expect(Math.max(...CREATURES.map(c => c.meters))).toBeLessThan(9500);
	});
});
