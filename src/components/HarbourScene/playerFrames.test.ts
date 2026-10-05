import { Texture } from "pixi.js";
import { describe, expect, it } from "vitest";

import animationData from "@assets/player/player-animations.json";
import { PLAYER_ANIMATIONS, type PlayerSheet } from "@constants/playerAnimations";

import { PLAYER_FRAME } from "./framing";
import { buildPlayerFrames, frameGeometry } from "./playerFrames";

const SHEET = { width: 1536, height: 1024 };
const usedFrames = Object.values(PLAYER_ANIMATIONS).flatMap(({ sheet, frames }) =>
	frames.map(frame => ({ sheet, frame }))
);

describe("frameGeometry", () => {
	it("cuts every frame an animation plays from inside its sheet, and sets it inside the box", () => {
		for (const { sheet, frame } of usedFrames) {
			const g = frameGeometry(sheet, frame);
			const where = `${sheet} frame ${frame}`;
			expect(g.x, where).toBeGreaterThanOrEqual(0);
			expect(g.y, where).toBeGreaterThanOrEqual(0);
			expect(g.x + g.width, where).toBeLessThanOrEqual(SHEET.width);
			expect(g.y + g.height, where).toBeLessThanOrEqual(SHEET.height);
			expect(g.trimX, where).toBeGreaterThanOrEqual(0);
			expect(g.trimY, where).toBeGreaterThanOrEqual(0);
			expect(g.trimX + g.width, where).toBeLessThanOrEqual(PLAYER_FRAME.width);
			expect(g.trimY + g.height, where).toBeLessThanOrEqual(PLAYER_FRAME.height);
			// A hull alone is ~240px, so anything narrower means a mistyped measurement.
			expect(g.width, where).toBeGreaterThan(240);
		}
	});

	it("stops each row's cut short of the row below, so no frame picks up its neighbour's hull", () => {
		for (const [sheet, { rows }] of Object.entries(animationData.sheets)) {
			const cuts = Array.from({ length: rows }, (_, row) =>
				frameGeometry(sheet as PlayerSheet, row * animationData.framesPerRow)
			);
			for (let row = 1; row < rows; row++) {
				expect(cuts[row].y, `${sheet} row ${row}`).toBeGreaterThanOrEqual(cuts[row - 1].y + cuts[row - 1].height);
			}
		}
	});

	it("runs the last frame of every row out to the sheet's edge, having no neighbour to stop short of", () => {
		for (const [sheet, { rows }] of Object.entries(animationData.sheets)) {
			for (let row = 0; row < rows; row++) {
				const last = frameGeometry(sheet as PlayerSheet, (row + 1) * animationData.framesPerRow - 1);
				expect(last.x + last.width, `${sheet} row ${row}`).toBe(SHEET.width);
			}
		}
	});
});

describe("buildPlayerFrames", () => {
	const frames = buildPlayerFrames({
		basic: Texture.WHITE,
		extended: Texture.WHITE
	});

	it("makes a texture for every cell, each reporting the shared box", () => {
		expect(frames.basic.textures).toHaveLength(24);
		expect(frames.extended.textures).toHaveLength(30);
		for (const texture of [...frames.basic.textures, ...frames.extended.textures]) {
			expect(texture.width).toBe(PLAYER_FRAME.width);
			expect(texture.height).toBe(PLAYER_FRAME.height);
		}
	});

	it("only stretches the squashed sheet", () => {
		expect(frames.basic.stretchY).toBe(1);
		expect(frames.extended.stretchY).toBeGreaterThan(1);
	});
});
