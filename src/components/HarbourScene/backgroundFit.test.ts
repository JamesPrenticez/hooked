import { describe, expect, it } from "vitest";

import { computeBackgroundFit, textureToScreen } from "./backgroundFit";

const DESKTOP = { width: 2149, height: 732 };
const MOBILE = { width: 942, height: 1670 };

describe("computeBackgroundFit", () => {
	it("draws the wide desktop strip fit to viewport width in landscape", () => {
		const fit = computeBackgroundFit({ width: 1920, height: 1080 }, DESKTOP, MOBILE);
		const scale = 1920 / 2149;

		expect(fit.texture).toBe(DESKTOP);
		expect(fit.scale).toBeCloseTo(scale);
		expect(fit.x).toBeCloseTo(960);
		expect(fit.y).toBeCloseTo(1080 - (DESKTOP.height * scale) / 2);
	});

	it("anchors the landscape strip's bottom edge flush with the screen bottom", () => {
		const fit = computeBackgroundFit({ width: 1920, height: 1080 }, DESKTOP, MOBILE);

		expect(fit.y + (DESKTOP.height * fit.scale) / 2).toBeCloseTo(1080);
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

describe("textureToScreen", () => {
	it("maps the texture centre to the fit's anchor point", () => {
		const fit = computeBackgroundFit({ width: 1080, height: 1920 }, DESKTOP, MOBILE);
		const centre = textureToScreen(fit, { x: MOBILE.width / 2, y: MOBILE.height / 2 });
		expect(centre.x).toBeCloseTo(fit.x);
		expect(centre.y).toBeCloseTo(fit.y);
	});

	it("scales an offset from the texture centre by the fit scale", () => {
		const fit = computeBackgroundFit({ width: 1920, height: 1080 }, DESKTOP, MOBILE);
		const point = textureToScreen(fit, { x: DESKTOP.width / 2 + 100, y: DESKTOP.height / 2 });
		expect(point.x).toBeCloseTo(fit.x + 100 * fit.scale);
		expect(point.y).toBeCloseTo(fit.y);
	});
});
