import { expect, it } from "vitest";

import { SIM_WIDTH, TICK_HZ } from "./simConfig";
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
	for (let i = 0; i < 60 * 300; i++) step(sim, 0);
	expect(sim.phase).toBe("bottom");
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
