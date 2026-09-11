import { describe, expect, it } from "vitest";

import { computeAmbience } from "./ambience";

const channels = (c: number) => [(c >> 16) & 0xff, (c >> 8) & 0xff, c & 0xff];
const brightness = (c: number) => channels(c).reduce((a, b) => a + b, 0);

describe("computeAmbience", () => {
	it("leaves the strip untinted at noon", () => {
		expect(computeAmbience(0.5).bgTint).toBe(0xffffff);
	});

	it("darkens the strip at night far below noon", () => {
		expect(brightness(computeAmbience(0).bgTint)).toBeLessThan(brightness(computeAmbience(0.5).bgTint));
	});

	it("wraps: t, t+1 and t-1 land on the same ambience", () => {
		const base = computeAmbience(0.15);
		for (const wrapped of [computeAmbience(1.15), computeAmbience(-0.85)]) {
			expect(wrapped.skyTop).toBe(base.skyTop);
			expect(wrapped.skyHorizon).toBe(base.skyHorizon);
			expect(wrapped.bgTint).toBe(base.bgTint);
			expect(wrapped.celestial.x).toBeCloseTo(base.celestial.x);
			expect(wrapped.celestial.isMoon).toBe(base.celestial.isMoon);
		}
	});

	it("interpolates between keyframes rather than snapping", () => {
		// 0.4 sits between the 0.34 and 0.5 keyframes.
		const mid = computeAmbience(0.4).skyHorizon;
		const lo = computeAmbience(0.34).skyHorizon;
		const hi = computeAmbience(0.5).skyHorizon;
		expect(brightness(mid)).toBeGreaterThan(brightness(hi));
		expect(brightness(mid)).toBeLessThan(brightness(lo));
	});

	describe("celestial body", () => {
		it("is the sun, near its zenith, at noon", () => {
			const { celestial } = computeAmbience(0.5);
			expect(celestial.isMoon).toBe(false);
			expect(celestial.x).toBeCloseTo(0.5);
			expect(celestial.intensity).toBeCloseTo(1);
			expect(celestial.y).toBeLessThan(0.2);
		});

		it("sits on the horizon with no intensity at sunrise", () => {
			const { celestial } = computeAmbience(0.25);
			expect(celestial.x).toBeCloseTo(0);
			expect(celestial.intensity).toBeCloseTo(0);
		});

		it("rises and sets at the scene horizon, not below it", () => {
			for (const t of [0.25, 0.75]) {
				expect(computeAmbience(t, { width: 400, height: 800 }).celestial.y).toBeCloseTo(0.5);
			}
		});

		it("flattens the arc on a portrait viewport", () => {
			const portrait = computeAmbience(0.5, { width: 400, height: 800 }).celestial.y;
			const landscape = computeAmbience(0.5, { width: 1200, height: 600 }).celestial.y;
			// higher y == lower peak == shallower arc
			expect(portrait).toBeGreaterThan(landscape);
		});

		it("is the moon during the night", () => {
			expect(computeAmbience(0).celestial.isMoon).toBe(true);
			expect(computeAmbience(0.9).celestial.isMoon).toBe(true);
		});
	});
});
