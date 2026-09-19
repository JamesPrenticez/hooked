import { describe, expect, it } from "vitest";

import { PX_PER_METER } from "@constants/depthZones";

import {
	BOAT_ANCHOR,
	boatLayout,
	cameraScroll,
	CAST_METERS,
	castProgress,
	depthToScreenY,
	hookWorldY,
	waterlineY
} from "./framing";

const VIEW = { width: 1920, height: 1080 };
const PORTRAIT = { width: 390, height: 844 };
const PLAYER = { width: 1536, height: 1024 };

describe("castProgress", () => {
	it("runs 0 at the boat to 1 once the cast is done, and holds", () => {
		expect(castProgress(0)).toBe(0);
		expect(castProgress(CAST_METERS)).toBe(1);
		expect(castProgress(CAST_METERS * 10)).toBe(1);
		expect(castProgress(-5)).toBe(0);
	});
});

describe("cameraScroll", () => {
	it("starts at rest", () => {
		expect(cameraScroll(0, VIEW)).toBe(0);
	});

	it("has scrolled the whole surface world off-screen by the end of the cast", () => {
		expect(cameraScroll(CAST_METERS, VIEW)).toBeGreaterThanOrEqual(waterlineY(VIEW));
	});

	it("never scrolls backwards while descending", () => {
		let last = -1;
		for (let depth = 0; depth <= CAST_METERS * 2; depth += 5) {
			const scroll = cameraScroll(depth, VIEW);
			expect(scroll).toBeGreaterThanOrEqual(last);
			last = scroll;
		}
	});

	it("carries on at the world scale once the cast is done", () => {
		const step = cameraScroll(CAST_METERS + 101, VIEW) - cameraScroll(CAST_METERS + 1, VIEW);
		expect(step).toBeCloseTo(100 * PX_PER_METER);
	});
});

describe("depthToScreenY", () => {
	it("puts the surface on the waterline before the cast", () => {
		expect(depthToScreenY(0, 0, VIEW)).toBeCloseTo(waterlineY(VIEW));
	});

	it("keeps whatever is at the hook's own depth level with the hook, once the cast is done", () => {
		for (const depth of [CAST_METERS, 1000, 6000]) {
			expect(depthToScreenY(depth, depth, VIEW)).toBeCloseTo(VIEW.height / 2);
		}
	});
});

describe("hookWorldY", () => {
	const tipY = 380;

	it("starts at the rod tip", () => {
		expect(hookWorldY(0, tipY, VIEW)).toBeCloseTo(tipY);
	});

	it("sits at half screen height on screen once the cast is done", () => {
		const depth = CAST_METERS + 200;
		expect(hookWorldY(depth, tipY, VIEW) - cameraScroll(depth, VIEW)).toBeCloseTo(VIEW.height / 2);
	});

	it("enters the water partway through the cast, not at the start or the end", () => {
		const entered = (depth: number) => hookWorldY(depth, tipY, VIEW) >= waterlineY(VIEW);
		expect(entered(0)).toBe(false);
		expect(entered(CAST_METERS)).toBe(true);
		const at = Array.from({ length: CAST_METERS }, (_, i) => i).find(entered);
		expect(at).toBeGreaterThan(0);
		expect(at).toBeLessThan(CAST_METERS);
	});
});

describe("boatLayout", () => {
	it("centres the boat on screen with its hull on the waterline", () => {
		const { x, y } = boatLayout(VIEW, PLAYER, 0);
		expect(x).toBe(VIEW.width / 2);
		expect(y).toBeCloseTo(waterlineY(VIEW));
	});

	it("keeps the whole boat inside the middle third", () => {
		for (const view of [VIEW, PORTRAIT, { width: 844, height: 390 }]) {
			const { y, scale } = boatLayout(view, PLAYER, 0);
			const top = y - PLAYER.height * scale * BOAT_ANCHOR.y;
			expect(top).toBeGreaterThanOrEqual(view.height / 3 - 1);
		}
	});

	it("fits within the screen width on a narrow portrait screen", () => {
		const { scale } = boatLayout(PORTRAIT, PLAYER, 0);
		expect(PLAYER.width * scale).toBeLessThanOrEqual(PORTRAIT.width);
	});

	it("hangs the line from the rod tip, above and right of the boat's centre", () => {
		const { x, y, tip } = boatLayout(VIEW, PLAYER, 0);
		expect(tip.x).toBeGreaterThan(x);
		expect(tip.y).toBeLessThan(y);
	});

	it("moves the rod tip with the bob", () => {
		expect(boatLayout(VIEW, PLAYER, 6).tip.y - boatLayout(VIEW, PLAYER, 0).tip.y).toBeCloseTo(6);
	});
});
