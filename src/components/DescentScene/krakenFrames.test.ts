import { expect, it } from "vitest";

import { KRAKEN_SHEETS } from "@constants/krakenAnimations";

import { krakenFrameRect, SHEET_CUTS } from "./krakenFrames";

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
	const { rows, cols } = SHEET_CUTS.reveal_parts;
	const rect = krakenFrameRect("reveal_parts", 6, 5, 7);
	expect(rect).toMatchObject({ x: cols[1][1], y: rows[1], width: cols[1][2] - cols[1][1], height: rows[2] - rows[1] });
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
