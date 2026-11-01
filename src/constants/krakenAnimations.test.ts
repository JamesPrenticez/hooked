import { describe, expect, it } from "vitest";

import {
	FIRST_KRAKEN_ANIMATION,
	KRAKEN_ANIMATIONS,
	KRAKEN_FIGHT,
	KRAKEN_FIGHT_SECONDS,
	KRAKEN_SHEETS,
	krakenFightBeat,
	krakenFrame
} from "./krakenAnimations";

// Mid-frame times, so a float landing a hair either side of a boundary can't flip a result.
const midFrame = (fps: number, frame: number) => (frame + 0.5) / fps;

describe("krakenFrame", () => {
	const loop = Object.values(KRAKEN_ANIMATIONS).find(({ loop }) => loop)!;
	const oneShot = KRAKEN_ANIMATIONS[FIRST_KRAKEN_ANIMATION];

	it("steps through the frames at the animation's fps", () => {
		expect(krakenFrame(oneShot.id, midFrame(oneShot.fps, 0))).toBe(oneShot.frames[0]);
		expect(krakenFrame(oneShot.id, midFrame(oneShot.fps, 1))).toBe(oneShot.frames[1]);
	});

	it("wraps a loop", () => {
		expect(krakenFrame(loop.id, midFrame(loop.fps, loop.frames.length))).toBe(loop.frames[0]);
		expect(krakenFrame(loop.id, midFrame(loop.fps, loop.frames.length + 1))).toBe(loop.frames[1]);
	});

	it("holds a one-shot on its last frame", () => {
		expect(oneShot.loop).toBe(false);
		expect(krakenFrame(oneShot.id, 1000)).toBe(oneShot.frames.at(-1));
	});

	it("starts on the first frame rather than reading off the start of the sheet", () => {
		expect(krakenFrame(oneShot.id, -1)).toBe(oneShot.frames[0]);
	});
});

describe("kraken-animations.json", () => {
	it("gives every animation a unique id", () => {
		const ids = KRAKEN_SHEETS.flatMap(sheet => sheet.animations.map(({ id }) => id));
		expect(new Set(ids).size).toBe(ids.length);
		expect(ids).toHaveLength(7);
	});

	it("keeps every animation's frames inside its sheet's grid", () => {
		for (const sheet of KRAKEN_SHEETS) {
			for (const animation of sheet.animations) {
				for (const frame of animation.frames) expect(frame, animation.id).toBeLessThan(sheet.columns * sheet.rows);
			}
		}
	});
});

describe("the trench fight", () => {
	const [grab, yank, tug] = KRAKEN_FIGHT;
	const beatSeconds = (id: string) => KRAKEN_ANIMATIONS[id].frames.length / KRAKEN_ANIMATIONS[id].fps;

	it("keeps every beat on one sheet, so the fight loads a single image", () => {
		expect(new Set(KRAKEN_FIGHT.map(id => KRAKEN_ANIMATIONS[id].sheet)).size).toBe(1);
	});

	it("keeps the Kraken on screen for 8 seconds", () => {
		expect(KRAKEN_FIGHT_SECONDS).toBe(8);
	});

	it("runs the grab, then the yank, then the tug", () => {
		expect(krakenFightBeat(0).id).toBe(grab);
		expect(krakenFightBeat(beatSeconds(grab) + 0.01).id).toBe(yank);
		expect(krakenFightBeat(beatSeconds(grab) + beatSeconds(yank) + 0.01).id).toBe(tug);
	});

	it("keeps tugging until the fight ends, from the top of the tug each time", () => {
		const tugStart = beatSeconds(grab) + beatSeconds(yank);
		expect(krakenFightBeat(KRAKEN_FIGHT_SECONDS).id).toBe(tug);
		expect(krakenFightBeat(tugStart + beatSeconds(tug) + 0.25).elapsed).toBeCloseTo(0.25);
		expect(krakenFightBeat(tugStart + beatSeconds(tug) * 5 + 0.25).elapsed).toBeCloseTo(0.25);
	});

	it("counts each beat's own time from zero", () => {
		expect(krakenFightBeat(beatSeconds(grab) + 0.25).elapsed).toBeCloseTo(0.25);
	});
});
