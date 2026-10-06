import { describe, expect, it } from "vitest";

import { depthToScreenY } from "@components/harbour-scene/framing";
import { DEPTH_ZONES, KRAKEN_DEPTH_METERS } from "@constants/depthZones";
import { KRAKEN_ANIMATIONS, KRAKEN_FIGHT, KRAKEN_FIGHT_SECONDS, KRAKEN_SHEETS } from "@constants/krakenAnimations";

import { krakenAnchorY, krakenFightPose, krakenFitScale, krakenHold } from "./krakenFight";
import { krakenBox, krakenGrip, krakenTop } from "./krakenFrames";

const [grab, yank] = KRAKEN_FIGHT;
const beatSeconds = (id: string) => KRAKEN_ANIMATIONS[id].frames.length / KRAKEN_ANIMATIONS[id].fps;
const sheet = KRAKEN_SHEETS.find(({ id }) => id === KRAKEN_ANIMATIONS[grab].sheet)!;

// Desktop, laptop, phone upright, phone on its side.
const DESKTOP = { width: 1920, height: 1080 };
const LAPTOP = { width: 1280, height: 720 };
const PHONE = { width: 390, height: 844 };
const PHONE_ON_ITS_SIDE = { width: 844, height: 390 };
const VIEWS = [DESKTOP, LAPTOP, PHONE, PHONE_ON_ITS_SIDE];
// Every one but the phone on its side is tall enough to show the jackpot line.
const TALL_VIEWS = [DESKTOP, LAPTOP, PHONE];

/** How far the bottom bar's Surface button — dead centre, where the hook is drawn — rises off the
 *  bottom of the screen (`BottomBar.module.css`). */
const SURFACE_BUTTON_TOP = 310;

/** Every 1/30s of the fight. */
const fightTimes = Array.from({ length: KRAKEN_FIGHT_SECONDS * 30 + 1 }, (_, i) => i / 30);

const jackpotLineY = (view: { width: number; height: number }, zones = DEPTH_ZONES) =>
	depthToScreenY(zones.find(zone => zone.id === "jackpot")!.fromMeters, KRAKEN_DEPTH_METERS, view);

/** Screen y of the highest point of the art, `elapsed` seconds into the fight. */
function artTop(view: { width: number; height: number }, elapsed: number, zones = DEPTH_ZONES) {
	const { frame, scale, sprite } = krakenFightPose(view, elapsed, zones);
	return sprite.y + krakenTop(sheet.id, sheet.columns, sheet.rows, frame) * scale;
}

describe("krakenFitScale", () => {
	it("fits a frame inside 90% of the width or half the height, whichever comes first", () => {
		expect(krakenFitScale({ width: 1000, height: 1000 }, { width: 100, height: 100 })).toBe(5);
		expect(krakenFitScale({ width: 200, height: 1000 }, { width: 100, height: 100 })).toBe(1.8);
	});
});

describe("krakenFightPose", () => {
	it("opens on the grab's first frame", () => {
		expect(krakenFightPose(DESKTOP, 0).frame).toBe(KRAKEN_ANIMATIONS[grab].frames[0]);
	});

	it("draws the Kraken a little bigger than the size that fits the screen", () => {
		for (const view of VIEWS) {
			const fits = krakenFitScale(view, krakenBox(sheet.columns, sheet.rows));
			expect(krakenFightPose(view, 0).scale).toBeCloseTo(1.2 * fits);
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

	it("keeps the hook on screen, and clear of the Surface button, however far the Kraken pulls it", () => {
		for (const view of VIEWS) {
			for (const elapsed of fightTimes) {
				const { grip } = krakenFightPose(view, elapsed);
				expect(grip.x).toBeGreaterThan(0);
				expect(grip.x).toBeLessThan(view.width);
				expect(grip.y).toBeGreaterThan(0);
				expect(grip.y).toBeLessThan(view.height);
			}
		}
		// A phone on its side has no room above the bar to keep it clear of.
		for (const view of TALL_VIEWS) {
			for (const elapsed of fightTimes) {
				expect(krakenFightPose(view, elapsed).grip.y).toBeLessThan(view.height - SURFACE_BUTTON_TOP);
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

	it("hangs under the jackpot line: no frame of the fight rises above it, and the highest keeps its padding", () => {
		for (const view of TALL_VIEWS) {
			const gaps = fightTimes.map(elapsed => artTop(view, elapsed) - jackpotLineY(view));
			const padding = krakenAnchorY(view) - jackpotLineY(view);
			expect(padding).toBeGreaterThan(0);
			expect(Math.min(...gaps)).toBeCloseTo(padding);
		}
	});

	it("keeps its highest point on screen, under the top edge, when the screen's too short to show the line", () => {
		expect(jackpotLineY(PHONE_ON_ITS_SIDE)).toBeLessThan(0);
		for (const elapsed of fightTimes) {
			expect(artTop(PHONE_ON_ITS_SIDE, elapsed)).toBeGreaterThan(krakenAnchorY(PHONE_ON_ITS_SIDE) - 1e-6);
		}
	});

	it("follows the jackpot line if the debug panel moves it", () => {
		const moved = DEPTH_ZONES.map(zone =>
			zone.id === "jackpot" ? { ...zone, fromMeters: zone.fromMeters + 100 } : zone
		);
		for (const view of TALL_VIEWS) {
			expect(krakenAnchorY(view, moved) - krakenAnchorY(view)).toBeCloseTo(
				jackpotLineY(view, moved) - jackpotLineY(view)
			);
			expect(artTop(view, 0, moved)).toBeGreaterThan(artTop(view, 0));
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
