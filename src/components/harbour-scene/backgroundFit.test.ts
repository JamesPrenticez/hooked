import { describe, expect, it } from "vitest";

import { computeBackgroundFit, textureToScreen } from "./backgroundFit";
import { horizonY } from "./framing";

const DESKTOP = { width: 1774, height: 887 };
const MOBILE = { width: 941, height: 1672 };

/** Screen y of the docks' waterline for a fit — the line the strip is placed by. */
function dockLineY(fit: ReturnType<typeof computeBackgroundFit>, fraction: number) {
	return textureToScreen(fit, { x: 0, y: fraction * fit.texture.height }).y;
}

describe("computeBackgroundFit", () => {
	it("draws the desktop export fit to viewport width in landscape", () => {
		const fit = computeBackgroundFit({ width: 1920, height: 1080 });

		expect(fit.texture).toEqual(DESKTOP);
		expect(fit.scale).toBeCloseTo(1920 / 1774);
		expect(fit.x).toBeCloseTo(960);
	});

	it("drops the docks' waterline below the top-third horizon in landscape", () => {
		const fit = computeBackgroundFit({ width: 1920, height: 1080 });

		expect(dockLineY(fit, 0.617)).toBeCloseTo(horizonY({ width: 1920, height: 1080 }));
	});

	it("draws the portrait composition fit to viewport width in portrait", () => {
		const fit = computeBackgroundFit({ width: 390, height: 844 });

		expect(fit.texture).toEqual(MOBILE);
		expect(fit.scale).toBeCloseTo(390 / 941);
		expect(fit.scale * MOBILE.width).toBeGreaterThanOrEqual(390);
	});

	it("puts the docks' waterline on the top-third horizon in portrait", () => {
		const fit = computeBackgroundFit({ width: 390, height: 844 });

		expect(dockLineY(fit, 0.644)).toBeCloseTo(844 / 3);
	});

	it("treats an exact square as landscape", () => {
		expect(computeBackgroundFit({ width: 1000, height: 1000 }).texture).toEqual(DESKTOP);
	});
});

describe("textureToScreen", () => {
	it("maps the texture centre to the fit's anchor point", () => {
		const fit = computeBackgroundFit({ width: 1080, height: 1920 });
		const centre = textureToScreen(fit, {
			x: MOBILE.width / 2,
			y: MOBILE.height / 2
		});
		expect(centre.x).toBeCloseTo(fit.x);
		expect(centre.y).toBeCloseTo(fit.y);
	});

	it("scales an offset from the texture centre by the fit scale", () => {
		const fit = computeBackgroundFit({ width: 1920, height: 1080 });
		const point = textureToScreen(fit, {
			x: DESKTOP.width / 2 + 100,
			y: DESKTOP.height / 2
		});
		expect(point.x).toBeCloseTo(fit.x + 100 * fit.scale);
		expect(point.y).toBeCloseTo(fit.y);
	});
});
