import { expect, it } from "vitest";

import { FISH, HOOKABLE_FISH } from "@constants/fish";

import { CAST_METERS, HOOK_TIP_DY, PX_PER_METER, SIM_WIDTH, TICK_HZ } from "./simConfig";
import { createSim, step } from "./simStep";
import { fishX, mouthAt, spawnWorld } from "./simWorld";

it("hooks every roster fish but the Kraken, each with a band and a sheet", () => {
	expect(HOOKABLE_FISH.map(f => f.id).sort()).toEqual(
		FISH.filter(f => f.id !== "kraken")
			.map(f => f.id)
			.sort()
	);
	for (const f of HOOKABLE_FISH) expect(f.count, f.id).toBeGreaterThan(1);
});

it("spawns the same world for a seed, a different one for another", () => {
	expect(spawnWorld(7)).toEqual(spawnWorld(7));
	expect(spawnWorld(7)).not.toEqual(spawnWorld(8));
	expect(spawnWorld(7)).toHaveLength(HOOKABLE_FISH.reduce((n, f) => n + f.count, 0));
});

it("keeps every fish inside its species' depth band", () => {
	for (const fish of spawnWorld(3)) {
		const band = HOOKABLE_FISH.find(f => f.id === fish.id)!;
		expect(fish.meters).toBeGreaterThanOrEqual(band.fromMeters);
		expect(fish.meters).toBeLessThanOrEqual(band.toMeters);
	}
});

it("swims fish across and wraps them, in closed form", () => {
	const fish = { ...spawnWorld(1)[0], offset: 0, speed: 100, width: 100 };
	expect(fishX({ ...fish, direction: -1 }, 0)).toBe(SIM_WIDTH + 50);
	expect(fishX({ ...fish, direction: 1 }, 0)).toBe(-50);
	expect(fishX({ ...fish, direction: 1 }, TICK_HZ)).toBe(50);
	const loop = ((SIM_WIDTH + 100) / 100) * TICK_HZ;
	expect(fishX({ ...fish, direction: 1 }, loop)).toBeCloseTo(-50);
});

it("mirrors the mouth with the fish", () => {
	const fish = spawnWorld(1)[0];
	const left = mouthAt({ ...fish, direction: -1 }, 0);
	const right = mouthAt({ ...fish, direction: 1 }, 0);
	expect(left.x - fishX({ ...fish, direction: -1 }, 0)).toBeCloseTo(-(right.x - fishX({ ...fish, direction: 1 }, 0)));
	expect(left.x).toBeLessThan(fishX({ ...fish, direction: -1 }, 0));
});

/** A sim with a single stationary fish whose mouth sits at (960, mouthY). */
function simWithMouthAt(mouthY: number) {
	const sim = createSim(1);
	const fish = { ...sim.world[0], speed: 0, offset: 0, direction: -1 as const };
	fish.mouth = { dx: 0, dy: 0, r: 20 };
	fish.meters = mouthY / PX_PER_METER;
	sim.world = [{ ...fish, offset: SIM_WIDTH + fish.width / 2 - SIM_WIDTH / 2 }];
	return sim;
}

it("hooks the mouth on first touch and freezes the hook", () => {
	const sim = simWithMouthAt(2000);
	let guard = 0;
	while (sim.phase === "descend" && guard++ < 60 * 30) step(sim, 0);
	expect(sim.phase).toBe("hooked");
	expect(sim.hooked).toBe(0);
	expect(sim.catchM).toBe(sim.depthM);
	const { depthM, x, tick } = sim;
	step(sim, 1);
	expect({ depthM, x }).toEqual({ depthM: sim.depthM, x: sim.x });
	expect(sim.tick).toBe(tick + 1);
	expect(sim.hookedTick).toBeLessThan(tick + 1);
	expect(sim.depthM * PX_PER_METER + HOOK_TIP_DY).toBeGreaterThan(2000 - 40);
});

it("misses a mouth that is off to the side", () => {
	const sim = simWithMouthAt(2000);
	sim.x = 100;
	for (let i = 0; i < 60 * 30 && sim.depthM * PX_PER_METER < 2400; i++) step(sim, 0);
	expect(sim.phase).toBe("descend");
	expect(sim.hooked).toBe(-1);
});

it("does not arm before the cast is over", () => {
	const sim = simWithMouthAt((CAST_METERS - 100) * PX_PER_METER);
	for (let i = 0; i < 60 * 3 && sim.depthM < CAST_METERS - 1; i++) step(sim, 0);
	expect(sim.hooked).toBe(-1);
});
