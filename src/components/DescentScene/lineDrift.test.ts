import { expect, it } from "vitest";

import { lineDrift } from "./lineDrift";

it("stays within -1..1", () => {
	for (let s = 0; s < 200; s += 1.7) {
		expect(lineDrift(s)).toBeGreaterThanOrEqual(-1);
		expect(lineDrift(s)).toBeLessThanOrEqual(1);
	}
});

it("wanders over time rather than sitting flat", () => {
	expect(lineDrift(0)).not.toBeCloseTo(lineDrift(10), 2);
});
