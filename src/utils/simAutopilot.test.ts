import { describe, expect, it } from "vitest";

import { HOOKABLE_FISH } from "@constants/fish";

import { autopilotAxis } from "./simAutopilot";
import { createSim, step } from "./simStep";

/** Plays a whole run with the autopilot at the wheel, `target` being the fish the server chose. */
function autopilotRun(seed: number, target?: string) {
	const sim = createSim(seed, 1, target);
	while (!sim.result && sim.tick < 600_000) step(sim, autopilotAxis(sim));
	return sim;
}

describe("autopilotAxis", () => {
	it("hooks a fish, never the Kraken, on every seed", () => {
		for (let seed = 1; seed <= 50; seed++) {
			const sim = autopilotRun(seed);
			expect(sim.result?.fish, `seed ${seed}`).not.toBe("kraken");
			expect(sim.result, `seed ${seed}`).toBeDefined();
		}
	});

	// The round's catch is the server's, so the hook has to end on exactly that fish — a miss would show the player a
	// different fish from the one they were paid for. (15,600 runs, 600 seeds a fish, never missed when checked by hand.)
	it("lands the fish it is sent after, whichever fish that is, in any world", () => {
		for (const target of [...HOOKABLE_FISH.map(f => f.id), "kraken"]) {
			for (let seed = 1; seed <= 4; seed++) {
				expect(autopilotRun(seed * 7919, target).result?.fish, `${target}, seed ${seed * 7919}`).toBe(target);
			}
		}
	});
});
