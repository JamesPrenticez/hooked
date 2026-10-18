import { describe, expect, it } from "vitest";

import { autopilotAxis } from "./simAutopilot";
import { createSim, step } from "./simStep";

describe("autopilotAxis", () => {
	it("hooks a fish, never the Kraken, on every seed", () => {
		for (let seed = 1; seed <= 50; seed++) {
			const sim = createSim(seed);
			while (!sim.result && sim.tick < 600_000) step(sim, autopilotAxis(sim));
			expect(sim.result?.fish, `seed ${seed}`).not.toBe("kraken");
			expect(sim.result, `seed ${seed}`).toBeDefined();
		}
	});
});
