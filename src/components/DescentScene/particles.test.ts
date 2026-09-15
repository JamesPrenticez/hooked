import { describe, expect, it } from "vitest";

import { parallaxParticles } from "./particles";

describe("parallaxParticles", () => {
	it("returns exactly `count` particles inside the unit square", () => {
		const particles = parallaxParticles(10, 0, 500, 1);
		expect(particles).toHaveLength(10);
		for (const p of particles) {
			expect(p.x).toBeGreaterThanOrEqual(0);
			expect(p.x).toBeLessThan(1);
			expect(p.y).toBeGreaterThanOrEqual(0);
			expect(p.y).toBeLessThan(1);
		}
	});

	it("is deterministic for the same inputs", () => {
		expect(parallaxParticles(5, 120, 500, 3)).toEqual(parallaxParticles(5, 120, 500, 3));
	});

	it("wraps back to the same layout after one full `speed` of depth", () => {
		const start = parallaxParticles(6, 0, 500, 7);
		const wrapped = parallaxParticles(6, 500, 500, 7);
		start.forEach((p, i) => expect(wrapped[i].y).toBeCloseTo(p.y, 10));
	});

	it("different seeds scatter differently", () => {
		expect(parallaxParticles(6, 0, 500, 1)).not.toEqual(parallaxParticles(6, 0, 500, 2));
	});
});
