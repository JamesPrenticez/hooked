import { expect, it } from "vitest";

import { HOOKED_TICKS, KRAKEN_FIGHT_TICKS, SIM_WIDTH, TICK_HZ } from "./simConfig";
import { ANNOUNCE_TICKS } from "./simExtraction";
import { createSim, type Sim, type SimPhase, step } from "./simStep";

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

/** A sim that has just hooked its first fish at `catchM`, ready to play the sequence out. */
function hookedSim(multiplier: number, catchM = 1000) {
	const sim = createSim(1, multiplier);
	Object.assign(sim, { phase: "hooked", hooked: 0, hookedTick: sim.tick, depthM: catchM, catchM, cameraM: catchM });
	return sim;
}

/** Steps `sim` until it enters `phase`, returning how many ticks that took. */
function runUntil(sim: Sim, phase: SimPhase, axis = 1) {
	let ticks = 0;
	while (sim.phase !== phase) {
		step(sim, axis);
		if (++ticks > 60 * 60) throw new Error(`never reached ${phase}, stuck in ${sim.phase}`);
	}
	return ticks;
}

it("takes the catch's multiplier, 1× by default", () => {
	expect(createSim(1).multiplier).toBe(1);
	expect(createSim(1, 250).multiplier).toBe(250);
});

it("keeps the camera on the hook all the way down", () => {
	const sim = emptySim();
	for (let i = 0; i < 300; i++) step(sim, 0);
	expect(sim.cameraM).toBeGreaterThan(0);
	expect(sim.cameraM).toBe(sim.depthM);
});

it("plays the catch in order: fight, splash, camera alone to the surface, landing, surfaced", () => {
	const sim = hookedSim(250);
	const phases = [sim.phase];
	while (sim.phase !== "surfaced") {
		step(sim, 1);
		if (sim.phase !== phases[phases.length - 1]) phases.push(sim.phase);
	}
	expect(phases).toEqual(["hooked", "announce", "ascend", "extract", "surfaced"]);
	expect(sim.result).toMatchObject({ fish: sim.world[0].id, depthM: 0 });
});

it("lets the fish fight the hook for a moment, then shows the splash with the fish still underwater", () => {
	const sim = hookedSim(1);
	expect(runUntil(sim, "announce")).toBe(HOOKED_TICKS);
	expect(HOOKED_TICKS / TICK_HZ).toBeGreaterThanOrEqual(1);
	expect(HOOKED_TICKS / TICK_HZ).toBeLessThanOrEqual(2);
	expect({ depthM: sim.depthM, cameraM: sim.cameraM }).toEqual({ depthM: 1000, cameraM: 1000 });
	expect(runUntil(sim, "ascend")).toBe(ANNOUNCE_TICKS);
});

it("brings only the camera back to the surface, leaving the hook and fish where they were", () => {
	const sim = hookedSim(1);
	runUntil(sim, "ascend");
	let lastCamera = sim.cameraM;
	while (sim.phase === "ascend") {
		step(sim, 1);
		expect(sim.depthM).toBe(1000);
		expect(sim.cameraM).toBeLessThanOrEqual(lastCamera);
		lastCamera = sim.cameraM;
	}
	expect(sim.phase).toBe("extract");
	expect(sim.cameraM).toBe(0);
	expect(sim.depthM).toBe(1000);
});

it("hauls the hook up to the surface in the landing, ignoring the steering", () => {
	const sim = hookedSim(1);
	runUntil(sim, "extract");
	const { x } = sim;
	let lastDepth = sim.depthM;
	while (sim.phase === "extract") {
		step(sim, 1);
		expect(sim.depthM).toBeLessThanOrEqual(lastDepth);
		expect(sim.cameraM).toBe(0);
		lastDepth = sim.depthM;
	}
	expect(sim.x).toBe(x);
	expect(sim.depthM).toBe(0);
	expect(sim.phase).toBe("surfaced");
});

it("takes longer to land a heavier catch, since it needs more gear", () => {
	const roundTicks = (multiplier: number) => {
		const sim = hookedSim(multiplier);
		runUntil(sim, "surfaced");
		return sim.tick;
	};
	expect(roundTicks(250)).toBeGreaterThan(roundTicks(1));
	expect(roundTicks(500)).toBeGreaterThan(roundTicks(250));
});

it("fights the Kraken at the bottom, then reels it in with the camera on the hook", () => {
	const sim = emptySim();
	sim.depthM = 11_399;
	while (sim.phase === "descend") step(sim, 0);
	expect(sim.phase).toBe("kraken");
	for (let i = 0; i < KRAKEN_FIGHT_TICKS; i++) step(sim, 0);
	expect(sim.phase).toBe("reel");
	while ((sim.phase as string) === "reel") {
		step(sim, 0);
		expect(sim.cameraM).toBe(sim.depthM);
	}
	expect(sim.result?.fish).toBe("kraken");
});
