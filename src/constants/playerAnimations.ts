import animationData from "@assets/player/player-animations.json";

type Sheets = typeof animationData.sheets;

/** The two sprite sheets, named as in `player-animations.json`. */
export type PlayerSheet = keyof Sheets;
export type PlayerAnimationName = keyof Sheets["basic"]["animations"] | keyof Sheets["extended"]["animations"];

export interface PlayerAnimation {
	sheet: PlayerSheet;
	/** Cells on the sheet, numbered left to right, top to bottom. */
	frames: number[];
	fps: number;
	loop: boolean;
	/** What plays once a one-shot finishes. Without one, it holds its last frame. */
	next?: PlayerAnimationName;
	description: string;
}

/** Every fisherman animation, straight from `player-animations.json` — tweak
 *  an fps, loop or `next` there. */
export const PLAYER_ANIMATIONS = {} as Record<PlayerAnimationName, PlayerAnimation>;
for (const sheet of Object.keys(animationData.sheets) as PlayerSheet[]) {
	for (const [name, animation] of Object.entries(animationData.sheets[sheet].animations)) {
		PLAYER_ANIMATIONS[name as PlayerAnimationName] = {
			...animation,
			sheet
		} as PlayerAnimation;
	}
}

export const PLAYER_ANIMATION_NAMES = Object.keys(PLAYER_ANIMATIONS) as PlayerAnimationName[];

export interface PlayerPose {
	sheet: PlayerSheet;
	/** Cell on the sheet, numbered left to right, top to bottom. */
	frame: number;
}

/**
 * What to draw `elapsed` seconds after `name` started. A loop wraps; a
 * one-shot plays through, then carries on into its `next` (idle after a cast)
 * or, with none, holds its last frame.
 */
export function playerPose(name: PlayerAnimationName, elapsed: number): PlayerPose {
	const animation = PLAYER_ANIMATIONS[name];
	const count = animation.frames.length;
	const step = Math.max(0, Math.floor(elapsed * animation.fps));

	if (!animation.loop && step >= count && animation.next) {
		return playerPose(animation.next, elapsed - count / animation.fps);
	}
	const index = animation.loop ? step % count : Math.min(step, count - 1);
	return { sheet: animation.sheet, frame: animation.frames[index] };
}
