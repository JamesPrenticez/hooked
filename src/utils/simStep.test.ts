import { expect, it } from "vitest";

import { HOOKED_TICKS, KRAKEN_FIGHT_TICKS, SIM_WIDTH, TICK_HZ } from "./simConfig";
import { createSim, step } from "./simStep";

/** A sim over an empty sea, so nothing gets hooked. */
function emptySim(seed = 1) {
	return { ...createSim(seed), world: [] };
}

function run(axis: number, ticks: number) {
	const sim = emptySim();
	for (let i = 0; i < ticks; i++) step(sim, axis);
	return sim;
}

it("starts centred and steers with the axis", () => {
	expect(createSim(1).x).toBe(SIM_WIDTH / 2);
	expect(run(1, 10).x).toBeGreaterThan(SIM_WIDTH / 2);
	expect(run(-1, 10).x).toBeLessThan(SIM_WIDTH / 2);
	expect(run(0, 10).x).toBe(SIM_WIDTH / 2);
});

it("crosses edge to edge in about 1.5s and stops at the wall", () => {
	const sim = emptySim();
	sim.x = 0;
	let ticks = 0;
	while (sim.x < SIM_WIDTH) {
		step(sim, 1);
		ticks++;
	}
	expect(ticks / TICK_HZ).toBeGreaterThan(1.3);
	expect(ticks / TICK_HZ).toBeLessThan(1.8);
	expect(sim.vx).toBe(0);
	step(sim, 1);
	expect(sim.x).toBeLessThanOrEqual(SIM_WIDTH);
});

it("descends on the zone speeds and holds at the bottom", () => {
	const sim = emptySim();
	step(sim, 0);
	expect(sim.depthM).toBeCloseTo(220 / TICK_HZ);
	while (sim.phase === "descend") step(sim, 0);
	expect(sim.phase).toBe("kraken");
	expect(sim.depthM).toBe(11_400);
});

it("is deterministic", () => {
	const inputs = Array.from({ length: 500 }, (_, i) => ((i % 7) - 3 > 0 ? 1 : i % 5 === 0 ? -1 : 0));
	const a = createSim(3);
	const b = createSim(3);
	for (const axis of inputs) {
		step(a, axis);
		step(b, axis);
	}
	expect(a).toEqual(b);
});

it("hooks, reels and surfaces with the fish caught", () => {
	const sim = createSim(1);
	sim.phase = "hooked";
	sim.hooked = 0;
	sim.hookedTick = sim.tick;
	sim.depthM = 1000;
	for (let i = 0; i < HOOKED_TICKS; i++) step(sim, 1);
	expect(sim.phase).toBe("reel");
	const x = sim.x;
	while ((sim.phase as string) === "reel") step(sim, 1);
	expect(sim.x).toBe(x);
	expect(sim.phase).toBe("surfaced");
	expect(sim.result).toMatchObject({ fish: sim.world[0].id, depthM: 0 });
});

it("fights the Kraken at the bottom, then reels it in", () => {
	const sim = emptySim();
	sim.depthM = 11_399;
	while (sim.phase === "descend") step(sim, 0);
	expect(sim.phase).toBe("kraken");
	for (let i = 0; i < KRAKEN_FIGHT_TICKS; i++) step(sim, 0);
	expect(sim.phase).toBe("reel");
	while ((sim.phase as string) === "reel") step(sim, 0);
	expect(sim.result?.fish).toBe("kraken");
});
