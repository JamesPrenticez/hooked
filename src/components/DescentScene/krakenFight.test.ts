import { describe, expect, it } from "vitest";

import { KRAKEN_ANIMATIONS, KRAKEN_FIGHT, KRAKEN_FIGHT_SECONDS, KRAKEN_SHEETS } from "@constants/krakenAnimations";

import { krakenFightPose, krakenFitScale, krakenHold } from "./krakenFight";
import { krakenBox, krakenGrip } from "./krakenFrames";

const [grab, yank] = KRAKEN_FIGHT;
const beatSeconds = (id: string) => KRAKEN_ANIMATIONS[id].frames.length / KRAKEN_ANIMATIONS[id].fps;
const sheet = KRAKEN_SHEETS.find(({ id }) => id === KRAKEN_ANIMATIONS[grab].sheet)!;

// Desktop, phone upright, phone on its side.
const VIEWS = [
	{ width: 1920, height: 1080 },
	{ width: 390, height: 844 },
	{ width: 844, height: 390 }
];

/** Every 1/30s of the fight. */
const fightTimes = Array.from({ length: KRAKEN_FIGHT_SECONDS * 30 + 1 }, (_, i) => i / 30);

describe("krakenFitScale", () => {
	it("fits a frame inside 90% of the width or half the height, whichever comes first", () => {
		expect(krakenFitScale({ width: 1000, height: 1000 }, { width: 100, height: 100 })).toBe(5);
		expect(krakenFitScale({ width: 200, height: 1000 }, { width: 100, height: 100 })).toBe(1.8);
	});
});

describe("krakenFightPose", () => {
	it("opens on the grab's first frame", () => {
		expect(krakenFightPose(VIEWS[0], 0).frame).toBe(KRAKEN_ANIMATIONS[grab].frames[0]);
	});

	it("draws the Kraken 2x the size that fits the screen", () => {
		for (const view of VIEWS) {
			const fits = krakenFitScale(view, krakenBox(sheet.columns, sheet.rows));
			expect(krakenFightPose(view, 0).scale).toBeCloseTo(2 * fits);
		}
	});

	it("keeps the hook in the coil: the grip sits on the sprite wherever the frame puts it", () => {
		for (const view of VIEWS) {
			for (const elapsed of fightTimes) {
				const { frame, scale, sprite, grip } = krakenFightPose(view, elapsed);
				const offset = krakenGrip(sheet.id, sheet.columns, sheet.rows, frame);
				expect(grip.x - sprite.x).toBeCloseTo(offset.x * scale);
				expect(grip.y - sprite.y).toBeCloseTo(offset.y * scale);
			}
		}
	});

	it("keeps the hook in the top half of the screen, clear of the bottom bar, however far the Kraken pulls it", () => {
		for (const view of VIEWS) {
			for (const elapsed of fightTimes) {
				const { grip } = krakenFightPose(view, elapsed);
				expect(grip.x).toBeGreaterThan(0);
				expect(grip.x).toBeLessThan(view.width);
				expect(grip.y).toBeGreaterThan(0);
				expect(grip.y).toBeLessThan(view.height / 2);
			}
		}
	});

	it("pulls the hook down through the yank", () => {
		const start = beatSeconds(grab) + 0.01;
		const end = beatSeconds(grab) + beatSeconds(yank) - 0.01;
		for (const view of VIEWS) {
			expect(krakenFightPose(view, end).grip.y).toBeGreaterThan(krakenFightPose(view, start).grip.y);
		}
	});
});

describe("krakenHold", () => {
	it("starts free, closes on the hook as the tentacle wraps it, then lets go by the end of the fight", () => {
		expect(krakenHold(0)).toBe(0);
		expect(krakenHold(0.25)).toBeGreaterThan(0);
		expect(krakenHold(0.25)).toBeLessThan(1);
		expect(krakenHold(KRAKEN_FIGHT_SECONDS / 2)).toBe(1);
		expect(krakenHold(KRAKEN_FIGHT_SECONDS)).toBe(0);
	});
});
