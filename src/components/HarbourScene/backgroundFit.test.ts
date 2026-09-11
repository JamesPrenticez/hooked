import { describe, expect, it } from "vitest";

import { computeBackgroundFit } from "./backgroundFit";

const DESKTOP = { width: 2149, height: 732 };
const MOBILE = { width: 942, height: 1670 };

describe("computeBackgroundFit", () => {
	it("draws the wide desktop strip fit to viewport width in landscape", () => {
		const fit = computeBackgroundFit({ width: 1920, height: 1080 }, DESKTOP, MOBILE);

		expect(fit.texture).toBe(DESKTOP);
		expect(fit.scale).toBeCloseTo(1920 / 2149);
		expect(fit).toMatchObject({ x: 960, y: 540 });
	});

	it("draws the portrait composition scaled to cover in portrait", () => {
		const fit = computeBackgroundFit({ width: 1080, height: 1920 }, DESKTOP, MOBILE);

		expect(fit.texture).toBe(MOBILE);
		expect(fit.scale).toBeCloseTo(Math.max(1080 / 942, 1920 / 1670));
	});

	it("still covers the viewport on a phone taller than 9:16", () => {
		const fit = computeBackgroundFit({ width: 1080, height: 2400 }, DESKTOP, MOBILE);

		expect(fit.scale).toBeCloseTo(2400 / 1670);
		expect(fit.scale * MOBILE.width).toBeGreaterThanOrEqual(1080);
		expect(fit.scale * MOBILE.height).toBeGreaterThanOrEqual(2400);
	});

	it("treats an exact square as landscape", () => {
		expect(computeBackgroundFit({ width: 1000, height: 1000 }, DESKTOP, MOBILE).texture).toBe(DESKTOP);
	});
});
