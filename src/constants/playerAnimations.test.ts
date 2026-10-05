import { describe, expect, it } from "vitest";

import animationData from "@assets/player/player-animations.json";

import { PLAYER_ANIMATION_NAMES, PLAYER_ANIMATIONS, playerPose } from "./playerAnimations";

// Mid-frame times, so a float landing a hair either side of a boundary can't flip a result.
const midFrame = (fps: number, frame: number) => (frame + 0.5) / fps;

describe("playerPose", () => {
	const { idle, cast, sad } = PLAYER_ANIMATIONS;

	it("steps a loop through its frames at its fps, then wraps", () => {
		expect(playerPose("idle", midFrame(idle.fps, 0))).toEqual({
			sheet: idle.sheet,
			frame: idle.frames[0]
		});
		expect(playerPose("idle", midFrame(idle.fps, 1)).frame).toBe(idle.frames[1]);
		expect(playerPose("idle", midFrame(idle.fps, idle.frames.length)).frame).toBe(idle.frames[0]);
		expect(playerPose("idle", midFrame(idle.fps, idle.frames.length + 1)).frame).toBe(idle.frames[1]);
	});

	it("plays a one-shot through, then carries on into its `next`", () => {
		const castLength = cast.frames.length / cast.fps;
		expect(cast.next).toBe("idle");
		expect(playerPose("cast", midFrame(cast.fps, cast.frames.length - 1)).frame).toBe(cast.frames.at(-1));
		expect(playerPose("cast", castLength + midFrame(idle.fps, 0)).frame).toBe(idle.frames[0]);
		expect(playerPose("cast", castLength + midFrame(idle.fps, 1)).frame).toBe(idle.frames[1]);
	});

	it("holds the last frame of a one-shot that has nothing after it", () => {
		expect(sad.loop).toBe(false);
		expect(sad.next).toBeUndefined();
		expect(playerPose("sad", 1000)).toEqual({
			sheet: sad.sheet,
			frame: sad.frames.at(-1)
		});
	});

	it("starts on the first frame rather than reading off the start of the sheet", () => {
		expect(playerPose("idle", -1).frame).toBe(idle.frames[0]);
	});

	it("settles every animation — following `next` always ends on a loop or a held frame", () => {
		for (const name of PLAYER_ANIMATION_NAMES) expect(() => playerPose(name, 1e6)).not.toThrow();
	});
});

describe("player-animations.json", () => {
	it("keeps every animation's frames on the row it declares, inside its sheet", () => {
		for (const sheet of Object.values(animationData.sheets)) {
			for (const [name, animation] of Object.entries(sheet.animations)) {
				for (const frame of animation.frames) {
					expect(Math.floor(frame / animationData.framesPerRow), name).toBe(animation.row);
					expect(frame, name).toBeLessThan(sheet.columns * sheet.rows);
				}
			}
		}
	});

	it("only chains into animations that exist", () => {
		for (const name of PLAYER_ANIMATION_NAMES) {
			const { next } = PLAYER_ANIMATIONS[name];
			if (next) expect(PLAYER_ANIMATION_NAMES).toContain(next);
		}
	});
});
