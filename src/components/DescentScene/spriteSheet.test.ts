import { describe, expect, it } from "vitest";

import { cellRect, frameIndex } from "./spriteSheet";

describe("frameIndex", () => {
	const swim = { row: 1, fps: 10, frameCount: 8 };

	it("advances at fps and loops", () => {
		expect(frameIndex(0, swim)).toBe(0);
		expect(frameIndex(0.35, swim)).toBe(3);
		expect(frameIndex(0.8, swim)).toBe(0);
	});
});

describe("cellRect", () => {
	it("splits the sheet evenly by its real size", () => {
		expect(cellRect({ width: 1774, height: 887 }, 8, 4, 1, 2)).toEqual({
			x: 443.5,
			y: 221.75,
			width: 221.75,
			height: 221.75
		});
	});
});
