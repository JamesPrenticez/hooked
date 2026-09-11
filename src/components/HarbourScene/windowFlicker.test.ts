import { expect, it } from "vitest";

import { windowFlicker } from "./windowFlicker";

it("stays within a subtle band around 1", () => {
	for (let s = 0; s < 100; s += 0.37) {
		expect(windowFlicker(s)).toBeGreaterThan(0.9);
		expect(windowFlicker(s)).toBeLessThan(1.1);
	}
});

it("varies over time rather than sitting flat", () => {
	expect(windowFlicker(0)).not.toBeCloseTo(windowFlicker(1), 2);
});
