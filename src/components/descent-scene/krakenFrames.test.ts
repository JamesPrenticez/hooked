import { describe, expect, it } from "vitest";

import { KRAKEN_ANIMATIONS, KRAKEN_FIGHT, KRAKEN_SHEETS } from "@constants/krakenAnimations";

import { krakenBox, krakenFrameRect, krakenGrip, krakenTop, SHEET_CUTS, SHEET_TOPS } from "./krakenFrames";

const rising = (edges: number[]) => edges.every((edge, i) => i === 0 || edge > edges[i - 1]);

it("has cuts for every sheet — a row of edges down the 1024px, and per row a set across the 1536px", () => {
	for (const { id, columns, rows } of KRAKEN_SHEETS) {
		const cuts = SHEET_CUTS[id];
		expect(cuts.rows, id).toHaveLength(rows + 1);
		expect([cuts.rows[0], cuts.rows.at(-1)], id).toEqual([0, 1024]);
		expect(rising(cuts.rows), id).toBe(true);

		expect(cuts.cols, id).toHaveLength(rows);
		for (const edges of cuts.cols) {
			expect(edges, id).toHaveLength(columns + 1);
			expect([edges[0], edges.at(-1)], id).toEqual([0, 1536]);
			expect(rising(edges), id).toBe(true);
		}
	}
});

it("numbers cells left to right, then top to bottom", () => {
	const { rows, cols } = SHEET_CUTS.coiled_yanks_full_body;
	const rect = krakenFrameRect("coiled_yanks_full_body", 6, 3, 7);
	expect(rect).toMatchObject({
		x: cols[1][1],
		y: rows[1],
		width: cols[1][2] - cols[1][1],
		height: rows[2] - rows[1]
	});
});

it("sets every cut inside the sheet, positioned against the even-grid box it was generated in", () => {
	for (const { id, columns, rows, animations } of KRAKEN_SHEETS) {
		for (const frame of animations.flatMap(a => a.frames)) {
			const r = krakenFrameRect(id, columns, rows, frame);
			expect([r.boxWidth, r.boxHeight], id).toEqual([1536 / columns, 1024 / rows]);
			expect(r.x + r.width, `${id} ${frame}`).toBeLessThanOrEqual(1536);
			expect(r.y + r.height, `${id} ${frame}`).toBeLessThanOrEqual(1024);
			// A cut can drift off its box, but not by more than a box's worth.
			expect(Math.abs(r.trimX), `${id} ${frame}`).toBeLessThan(r.boxWidth);
			expect(Math.abs(r.trimY), `${id} ${frame}`).toBeLessThan(r.boxHeight);
		}
	}
});

describe("the hook grips", () => {
	const sheet = KRAKEN_SHEETS.find(({ id }) => id === KRAKEN_ANIMATIONS[KRAKEN_FIGHT[0]].sheet)!;
	const box = krakenBox(sheet.columns, sheet.rows);
	const grip = (frame: number) => krakenGrip(sheet.id, sheet.columns, sheet.rows, frame);

	it("has one for every frame the fight plays, inside that frame's box", () => {
		for (const frame of KRAKEN_FIGHT.flatMap(id => KRAKEN_ANIMATIONS[id].frames)) {
			expect(Math.abs(grip(frame).x), `frame ${frame}`).toBeLessThan(box.width / 2);
			expect(Math.abs(grip(frame).y), `frame ${frame}`).toBeLessThan(box.height / 2);
		}
	});

	it("measures from the middle of the box: the yank's coil starts up high and is pulled down to the beak", () => {
		const { frames } = KRAKEN_ANIMATIONS[KRAKEN_FIGHT[1]];
		expect(grip(frames[0]).y).toBeLessThan(-box.height / 4);
		expect(grip(frames[frames.length - 1]).y).toBeGreaterThan(box.height / 8);
	});
});

describe("the art tops", () => {
	const sheet = KRAKEN_SHEETS.find(({ id }) => id === KRAKEN_ANIMATIONS[KRAKEN_FIGHT[0]].sheet)!;
	const fightFrames = KRAKEN_FIGHT.flatMap(id => KRAKEN_ANIMATIONS[id].frames);

	it("has one for every frame the fight plays, inside that frame's cut", () => {
		for (const frame of fightFrames) {
			const cut = krakenFrameRect(sheet.id, sheet.columns, sheet.rows, frame);
			expect(SHEET_TOPS[sheet.id][frame], `frame ${frame}`).toBeGreaterThanOrEqual(cut.y);
			expect(SHEET_TOPS[sheet.id][frame], `frame ${frame}`).toBeLessThan(cut.y + cut.height);
		}
	});

	it("measures from the middle of the box: always above it, and above where the hook is gripped", () => {
		for (const frame of fightFrames) {
			const top = krakenTop(sheet.id, sheet.columns, sheet.rows, frame);
			expect(top, `frame ${frame}`).toBeLessThan(0);
			expect(top, `frame ${frame}`).toBeLessThan(krakenGrip(sheet.id, sheet.columns, sheet.rows, frame).y);
		}
	});
});
