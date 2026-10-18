import { describe, expect, it } from "vitest";

import { hookWorldY, waterlineY } from "@components/harbour-scene/framing";

import { hookX, lineDrift } from "./lineDrift";

const VIEW = { width: 1920, height: 1080 };

it("stays within -1..1", () => {
	for (let s = 0; s < 200; s += 0.1) {
		expect(lineDrift(s)).toBeGreaterThanOrEqual(-1);
		expect(lineDrift(s)).toBeLessThanOrEqual(1);
	}
});

it("sweeps across most of the screen rather than sitting flat", () => {
	const xs = Array.from({ length: 300 }, (_, i) => hookX(1200, VIEW, 10_000, i * 0.1));
	expect(Math.min(...xs)).toBeLessThan(VIEW.width * 0.3);
	expect(Math.max(...xs)).toBeGreaterThan(VIEW.width * 0.7);
});

describe("hookX", () => {
	it("hangs straight under the rod tip while above the water", () => {
		expect(hookX(1200, VIEW, -50, 3)).toBe(1200);
		expect(hookX(1200, VIEW, 0, 3)).toBe(1200);
	});

	it("eases into the sweep after entering the water, without jumping", () => {
		const target = hookX(1200, VIEW, 10_000, 3);
		const mid = hookX(1200, VIEW, VIEW.height * 0.125, 3);
		expect(mid).toBeGreaterThan(Math.min(1200, target));
		expect(mid).toBeLessThan(Math.max(1200, target));
	});
});

it("never jerks sideways as the hook goes through the surface", () => {
	const view = VIEW;
	const tipX = 1200;
	const tipY = 380;
	const dt = 1 / 60;
	let last = hookX(tipX, view, hookWorldY(0, tipY, view) - waterlineY(view), 0);
	let lastSpeed = 0;
	let fastest = 0;
	let sharpest = 0;
	// The descent runs at 220 m/s (the default shallow speed), so the cast takes ~1.4s.
	for (let i = 1; i < 60 * 6; i++) {
		const depth = 220 * i * dt;
		const x = hookX(tipX, view, hookWorldY(depth, tipY, view) - waterlineY(view), i * dt);
		const speed = (x - last) / dt;
		fastest = Math.max(fastest, Math.abs(speed));
		sharpest = Math.max(sharpest, Math.abs(speed - lastSpeed) / dt);
		lastSpeed = speed;
		last = x;
	}
	// The sweep alone tops out near 815 px/s² — the surface crossing must not add to that.
	expect(sharpest).toBeLessThan(1000);
	expect(fastest).toBeLessThan(720);
});
