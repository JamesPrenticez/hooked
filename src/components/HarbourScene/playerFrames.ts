import { Rectangle, Texture } from "pixi.js";

import animationData from "@assets/player/player-animations.json";
import type { PlayerSheet } from "@constants/playerAnimations";

import { HULL_Y, PLAYER_FRAME } from "./framing";

/** Both sheets are 1536px across `framesPerRow` columns. */
const SHEET_WIDTH = 1536;
/** Rows of hull kept below the hull line — its last pixels. */
const BELOW = 2;
/** Columns kept left of a hull's outermost column. */
const MARGIN = 2;

interface SheetLayout {
	rows: {
		/** Sheet y of the hull's bottom edge. */
		hull: number;
		/** How far the tallest pose in the row rises above it. */
		above: number;
		/** Per column: sheet x of the hull's left and right ends. */
		left: number[];
		right: number[];
	}[];
	/** Stretch that undoes the sheet's squash, applied when drawing. */
	stretchY: number;
}

/**
 * Where each frame really is. The sheets aren't on the tidy grid
 * `player-animations.json` describes: rows sit at uneven heights (the hull's
 * bottom edge lands 30px apart from row to row), frames wander sideways and
 * pack tightly — a rod tip runs out into the gap before the next frame — and
 * the extended sheet's rows are squashed ~15% to fit five to a sheet. Cut at
 * nominal 256px cells the boat would hop and shuffle every time the animation
 * changed, with slivers of the neighbouring hull showing. So each frame is cut
 * from just left of its own hull to just short of the next one, and set in the
 * `PLAYER_FRAME` box with its hull centred on the box and its bottom on
 * `HULL_Y`.
 *
 * Measured off the hulls' silhouettes, the gaps between them being empty —
 * re-measure if the sheets are redrawn. Sheet pixels; both sheets are 1536x1024.
 * One flaw stays: where a rod tip reaches past the next hull's edge, a few
 * pixels of it show at that frame's top-left (worst in `cast`'s last two).
 */
const SHEETS: Record<PlayerSheet, SheetLayout> = {
	basic: {
		rows: [
			{
				hull: 241,
				above: 233,
				left: [11, 267, 521, 771, 1022, 1283],
				right: [255, 511, 761, 1011, 1268, 1527]
			},
			{
				hull: 472,
				above: 188,
				left: [10, 266, 516, 774, 1026, 1284],
				right: [252, 506, 761, 1017, 1270, 1526]
			},
			{
				hull: 735,
				above: 220,
				left: [10, 266, 519, 772, 1026, 1283],
				right: [255, 508, 762, 1016, 1273, 1528]
			},
			{
				hull: 976,
				above: 208,
				left: [7, 266, 520, 770, 1025, 1283],
				right: [255, 511, 764, 1017, 1272, 1527]
			}
		],
		stretchY: 1
	},
	extended: {
		rows: [
			{
				hull: 213,
				above: 207,
				left: [13, 263, 515, 769, 1024, 1287],
				right: [253, 504, 755, 1011, 1270, 1527]
			},
			{
				hull: 432,
				above: 216,
				left: [13, 263, 515, 766, 1025, 1284],
				right: [252, 503, 755, 1012, 1269, 1526]
			},
			{
				hull: 628,
				above: 190,
				left: [13, 266, 519, 770, 1030, 1289],
				right: [254, 509, 761, 1016, 1278, 1526]
			},
			{
				hull: 820,
				above: 181,
				left: [13, 263, 513, 769, 1031, 1289],
				right: [253, 503, 757, 1018, 1277, 1527]
			},
			{
				hull: 1012,
				above: 176,
				left: [13, 270, 526, 776, 1031, 1289],
				right: [256, 514, 766, 1021, 1277, 1529]
			}
		],
		stretchY: 1.15
	}
};

export interface FrameGeometry {
	/** The frame's pixels on the sheet. */
	x: number;
	y: number;
	width: number;
	height: number;
	/** Where those pixels sit in the `PLAYER_FRAME` box. */
	trimX: number;
	trimY: number;
}

/** Cell `frame` of `sheet` (numbered left to right, top to bottom): where to cut it and where it goes in the box. */
export function frameGeometry(sheet: PlayerSheet, frame: number): FrameGeometry {
	const columns = animationData.framesPerRow;
	const row = Math.floor(frame / columns);
	const col = frame % columns;
	const { hull, above, left, right } = SHEETS[sheet].rows[row];

	const x = left[col] - MARGIN;
	const end = col < columns - 1 ? left[col + 1] - 1 : SHEET_WIDTH;
	const centre = (left[col] + right[col]) / 2;

	return {
		x,
		y: hull - above,
		width: end - x,
		height: above + BELOW,
		trimX: Math.round(PLAYER_FRAME.width / 2 - (centre - x)),
		trimY: HULL_Y - above
	};
}

export type PlayerFrames = Record<PlayerSheet, { textures: Texture[]; stretchY: number }>;

/** One texture per sheet cell, indexed like `PlayerPose.frame`. Each reports the
 *  full `PLAYER_FRAME` box, so one sprite anchor fits every frame. */
export function buildPlayerFrames(sheets: Record<PlayerSheet, Texture>): PlayerFrames {
	const cut = (sheet: PlayerSheet) =>
		Array.from({ length: SHEETS[sheet].rows.length * animationData.framesPerRow }, (_, frame) => {
			const { x, y, width, height, trimX, trimY } = frameGeometry(sheet, frame);
			return new Texture({
				source: sheets[sheet].source,
				frame: new Rectangle(x, y, width, height),
				orig: new Rectangle(0, 0, PLAYER_FRAME.width, PLAYER_FRAME.height),
				trim: new Rectangle(trimX, trimY, width, height)
			});
		});

	return {
		basic: { textures: cut("basic"), stretchY: SHEETS.basic.stretchY },
		extended: { textures: cut("extended"), stretchY: SHEETS.extended.stretchY }
	};
}
