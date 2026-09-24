/** All seven sheets are 1536x1024. */
const SHEET_WIDTH = 1536;
const SHEET_HEIGHT = 1024;

/**
 * Where each sheet's frames really are, in sheet pixels: `rows` are the y edges
 * between rows (`rows + 1` of them) and `cols[row]` the x edges between that
 * row's frames (`columns + 1`). The sheets are generated art, so
 * `kraken-animations.json`'s grid is only the logical order — rows sit at uneven
 * heights and a frame drifts off its even column (the reveal tentacles reach
 * across into the next cell). Each edge is the line, near its nominal spot,
 * crossing the least art on the sheet's alpha channel, so a frame doesn't pick
 * up a slice of its neighbour; a few tentacles do still cross a cut (worst: ~80
 * pixels, in `reveal_parts` and `swats_full_body`). Re-measure if a sheet is redrawn.
 */
export const SHEET_CUTS: Record<string, { rows: number[]; cols: number[][] }> = {
	reveal_parts: {
		rows: [0, 255, 470, 604, 785, 1024],
		cols: [
			[0, 281, 512, 813, 1051, 1262, 1536],
			[0, 285, 512, 778, 1024, 1280, 1536],
			[0, 264, 528, 781, 1036, 1284, 1536],
			[0, 249, 522, 768, 1024, 1287, 1536],
			[0, 247, 513, 738, 1024, 1280, 1536]
		]
	},
	attack_parts: {
		rows: [0, 169, 338, 505, 666, 819, 1024],
		cols: [
			[0, 256, 512, 768, 1024, 1280, 1536],
			[0, 256, 512, 768, 1024, 1280, 1536],
			[0, 256, 512, 768, 1024, 1280, 1536],
			[0, 261, 512, 768, 1023, 1281, 1536],
			[0, 257, 512, 768, 1024, 1280, 1536],
			[0, 256, 512, 768, 1024, 1280, 1536]
		]
	},
	seabed_full_body: {
		rows: [0, 256, 506, 766, 1024],
		cols: [
			[0, 384, 768, 1152, 1536],
			[0, 384, 768, 1152, 1536],
			[0, 384, 768, 1152, 1536],
			[0, 384, 768, 1152, 1536]
		]
	},
	swimming_full_body: {
		rows: [0, 256, 507, 768, 1024],
		cols: [
			[0, 384, 768, 1136, 1536],
			[0, 384, 773, 1152, 1536],
			[0, 384, 768, 1149, 1536],
			[0, 342, 728, 1145, 1536]
		]
	},
	hook_play_full_body: {
		rows: [0, 256, 493, 749, 1024],
		cols: [
			[0, 263, 515, 770, 1025, 1280, 1536],
			[0, 258, 518, 777, 1033, 1286, 1536],
			[0, 263, 514, 778, 1029, 1286, 1536],
			[0, 263, 527, 781, 1048, 1296, 1536]
		]
	},
	coiled_yanks_full_body: {
		rows: [0, 341, 663, 1024],
		cols: [
			[0, 261, 516, 769, 1024, 1280, 1536],
			[0, 264, 536, 797, 1035, 1280, 1536],
			[0, 274, 521, 771, 1041, 1298, 1536]
		]
	},
	swats_full_body: {
		rows: [0, 341, 683, 1024],
		cols: [
			[0, 261, 522, 770, 1027, 1291, 1536],
			[0, 260, 521, 777, 1027, 1283, 1536],
			[0, 261, 515, 780, 1028, 1302, 1536]
		]
	}
};

/**
 * Where a tentacle has the hook in each frame of a sheet the fight plays, in
 * sheet pixels: the middle of the coil, or the curl by the beak once it's pulled
 * down. Read off the art against a grid, so good to ~8px. Re-measure if a sheet
 * is redrawn.
 */
export const SHEET_GRIPS: Record<string, [x: number, y: number][]> = {
	coiled_yanks_full_body: [
		// double_wrap: reach, C curl, closed loop, second wrap, tighten, secure grip
		[203, 78],
		[428, 90],
		[658, 96],
		[893, 100],
		[1148, 78],
		[1405, 80],
		// hard_yank: high grip, windup, taut pull, downstroke, low pull, brace
		[133, 392],
		[370, 432],
		[600, 452],
		[890, 580],
		[1140, 595],
		[1428, 588],
		// repeat_tug: low grip, raise, high anticipation, diagonal yank, recoil, settle
		[155, 890],
		[378, 762],
		[643, 706],
		[904, 890],
		[1207, 895],
		[1436, 906]
	]
};

/**
 * How high the art reaches in each frame of a sheet the fight plays, in sheet
 * pixels: the first row with any real opacity (alpha over 40), which is what a
 * player sees as the Kraken's top. Measured off the alpha channel, so good to a
 * pixel or two. Re-measure if a sheet is redrawn.
 */
export const SHEET_TOPS: Record<string, number[]> = {
	coiled_yanks_full_body: [43, 51, 51, 42, 40, 35, 348, 388, 412, 463, 462, 475, 768, 727, 665, 762, 775, 793]
};

/** The nominal even-grid cell of a `columns` x `rows` sheet — what each frame is set in. */
export function krakenBox(columns: number, rows: number) {
	return { width: SHEET_WIDTH / columns, height: SHEET_HEIGHT / rows };
}

/** Where the art's highest point is in `frame`, in sheet pixels from the middle of the frame's box
 *  (`krakenFrameRect`'s) — negative, being above it. */
export function krakenTop(sheetId: string, columns: number, rows: number, frame: number) {
	return SHEET_TOPS[sheetId][frame] - (Math.floor(frame / columns) + 0.5) * krakenBox(columns, rows).height;
}

/** Where the hook is in `frame`, in sheet pixels from the middle of the frame's box (`krakenFrameRect`'s) —
 *  the box a sprite is anchored on, so this is the grip's offset from the sprite's position. */
export function krakenGrip(sheetId: string, columns: number, rows: number, frame: number) {
	const [x, y] = SHEET_GRIPS[sheetId][frame];
	const box = krakenBox(columns, rows);
	return {
		x: x - ((frame % columns) + 0.5) * box.width,
		y: y - (Math.floor(frame / columns) + 0.5) * box.height
	};
}

/**
 * Cell `frame` (numbered left to right, top to bottom) of a `columns` x `rows`
 * sheet: the pixels to cut, and where they sit in the sheet's nominal even-grid
 * cell (`boxWidth` x `boxHeight`). A texture set in that box keeps each frame
 * where it was drawn relative to the grid, so a sprite anchored on the box
 * doesn't wobble as the cuts' widths differ.
 */
export function krakenFrameRect(sheetId: string, columns: number, rows: number, frame: number) {
	const cuts = SHEET_CUTS[sheetId];
	const row = Math.floor(frame / columns);
	const col = frame % columns;
	const { width: boxWidth, height: boxHeight } = krakenBox(columns, rows);
	const x = cuts.cols[row][col];
	const y = cuts.rows[row];

	return {
		x,
		y,
		width: cuts.cols[row][col + 1] - x,
		height: cuts.rows[row + 1] - y,
		boxWidth,
		boxHeight,
		trimX: x - col * boxWidth,
		trimY: y - row * boxHeight
	};
}
