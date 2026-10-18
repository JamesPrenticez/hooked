import { expect, it } from "vitest";

import { waterSwell } from "./waterSwell";

it("stays within a gentle band around 0", () => {
	for (let s = 0; s < 100; s += 0.37) {
		expect(waterSwell(s)).toBeGreaterThan(-5);
		expect(waterSwell(s)).toBeLessThan(5);
	}
});

it("varies over time rather than sitting flat", () => {
	expect(waterSwell(0)).not.toBeCloseTo(waterSwell(1), 2);
});

it("staggers by phase so layers don't bob in lockstep", () => {
	expect(waterSwell(5, 0)).not.toBeCloseTo(waterSwell(5, 2), 2);
});
