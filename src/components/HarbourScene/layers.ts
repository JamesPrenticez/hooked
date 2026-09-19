import type { Graphics } from "pixi.js";

import { HORIZON_Y, WATERLINE_Y } from "./framing";

/** Screen the harbour is drawn into. Layers size themselves off this — no
 *  fixed art board yet, so a placeholder reads correctly at any aspect
 *  (desktop, landscape mobile, portrait mobile). */
export interface HarbourView {
	width: number;
	height: number;
}

export interface HarbourLayer {
	id: string;
	/** The BUILD_PLAN §7.1 checklist item this layer stands in for. */
	covers: string;
	/** Straight-line placeholder drawing — no branches, so it's cheap to
	 *  cover and a real asset swaps in by replacing the body. */
	draw: (g: Graphics, view: HarbourView) => void;
}

// Dusk palette — warm sky over cool water, brand yellow (--color-primary) on
// the working steel. Hex numbers because Pixi takes colours, not CSS vars.
const SKY_TOP = 0x1a2740;
const SKY_MID = 0x35507a;
const SKY_GLOW = 0xc9743c;
const CITY = 0x222c44;
const WATER = 0x123a52;
const WATER_DEEP = 0x0d2b3d;
const HORIZON = 0x2f6f90;
const DECK = 0x5b4633;
const DECK_EDGE = 0x6f5946;
const PILE = 0x3d2f20;
const STEEL = 0x49555f;
const ACCENT = 0xf2b93a;

/** Fraction of height where the dock deck starts. */
const DECK_Y = 0.72;

function drawBoat(g: Graphics, x: number, y: number, s: number, hull: number, cabin: number) {
	g.poly([x, y, x + 62 * s, y, x + 50 * s, y + 17 * s, x + 10 * s, y + 17 * s]).fill(hull);
	g.rect(x + 18 * s, y - 15 * s, 20 * s, 15 * s).fill(cabin);
	g.moveTo(x + 31 * s, y - 15 * s)
		.lineTo(x + 31 * s, y - 32 * s)
		.stroke({ width: 2, color: 0x2a2320 });
}

function drawCrane(g: Graphics, x: number, baseY: number, height: number) {
	g.rect(x - 6, baseY - height, 12, height).fill(STEEL);
	g.moveTo(x, baseY - height)
		.lineTo(x + 130, baseY - height + 44)
		.stroke({ width: 8, color: STEEL });
	g.moveTo(x, baseY - height)
		.lineTo(x - 52, baseY - height + 26)
		.stroke({ width: 6, color: STEEL });
	g.circle(x + 130, baseY - height + 44, 5).fill(ACCENT);
	g.moveTo(x + 130, baseY - height + 44)
		.lineTo(x + 130, baseY - height + 96)
		.stroke({ width: 2, color: 0x2b2b2b });
}

// Back to front. The array order IS the z-order (layers.test.ts locks it).
export const HARBOUR_LAYERS: HarbourLayer[] = [
	{
		id: "sky",
		covers: "Lighting (backdrop)",
		draw: (g, { width: w, height: h }) => {
			const horizon = h * HORIZON_Y;
			g.rect(0, 0, w, horizon * 0.4).fill(SKY_TOP);
			g.rect(0, horizon * 0.4, w, horizon * 0.35).fill(SKY_MID);
			g.rect(0, horizon * 0.75, w, horizon * 0.25).fill(SKY_GLOW);
		}
	},
	{
		id: "buildings",
		covers: "Buildings",
		draw: (g, { width: w, height: h }) => {
			const base = h * HORIZON_Y;
			const block = (x: number, wf: number, hf: number) => g.rect(w * x, base - h * hf, w * wf, h * hf).fill(CITY);
			block(0.0, 0.14, 0.16);
			block(0.12, 0.1, 0.1);
			block(0.22, 0.09, 0.22);
			block(0.34, 0.13, 0.13);
			block(0.5, 0.11, 0.18);
			block(0.63, 0.16, 0.11);
			block(0.8, 0.1, 0.2);
			block(0.9, 0.12, 0.14);
			// a few lit windows
			for (const [x, y] of [
				[0.25, 0.4],
				[0.53, 0.42],
				[0.82, 0.39],
				[0.27, 0.46]
			]) {
				g.rect(w * x, h * y, 4, 4).fill({ color: ACCENT, alpha: 0.7 });
			}
		}
	},
	{
		id: "ocean",
		covers: "Ocean",
		draw: (g, { width: w, height: h }) => {
			const top = h * HORIZON_Y;
			const bottom = h * WATERLINE_Y;
			g.rect(0, top, w, bottom - top).fill(WATER);
			g.rect(0, top, w, 3).fill(HORIZON);
			g.rect(0, h * 0.5, w, bottom - h * 0.5).fill(WATER_DEEP);
			g.rect(0, h * 0.42, w * 0.5, 2).fill({ color: HORIZON, alpha: 0.3 });
			g.rect(w * 0.4, h * 0.46, w * 0.4, 2).fill({ color: HORIZON, alpha: 0.25 });
		}
	},
	{
		id: "boats",
		covers: "Boats",
		draw: (g, { width: w, height: h }) => {
			drawBoat(g, w * 0.12, h * 0.6, 1.1, 0x3a2f2a, 0xd9c9a1);
			drawBoat(g, w * 0.55, h * 0.585, 0.9, 0x2f3a3a, 0xcdd6d0);
			drawBoat(g, w * 0.78, h * 0.63, 1.3, 0x402a2a, 0xe0b48a);
		}
	},
	{
		id: "dock",
		covers: "Harbour + Dock",
		draw: (g, { width: w, height: h }) => {
			const deckTop = h * DECK_Y;
			g.rect(0, deckTop, w, h * 0.12).fill(DECK);
			g.rect(0, deckTop, w, 4).fill(DECK_EDGE);
			for (const x of [0.1, 0.3, 0.5, 0.7, 0.9]) {
				g.rect(w * x, deckTop + h * 0.12, 10, h * 0.16).fill(PILE);
			}
			for (const x of [0.16, 0.34, 0.52, 0.72, 0.86]) {
				g.rect(w * x, deckTop + 8, 2, h * 0.1).fill({ color: PILE, alpha: 0.5 });
			}
		}
	},
	{
		id: "cranes",
		covers: "Cranes",
		draw: (g, { width: w, height: h }) => {
			drawCrane(g, w * 0.2, h * DECK_Y, h * 0.42);
			drawCrane(g, w * 0.68, h * DECK_Y, h * 0.5);
		}
	},
	{
		id: "props",
		covers: "Props",
		draw: (g, { width: w, height: h }) => {
			const y = h * DECK_Y;
			// crate stack
			g.rect(w * 0.06, y - 46, 40, 40).fill(0x6b5330);
			g.rect(w * 0.06 + 44, y - 30, 26, 26).fill(0x7a6038);
			g.moveTo(w * 0.06, y - 46)
				.lineTo(w * 0.06 + 40, y - 6)
				.stroke({ width: 2, color: 0x3f3120 });
			// bollard
			g.rect(w * 0.42, y - 20, 14, 20).fill(0x2c2c30);
			g.circle(w * 0.42 + 7, y - 20, 9).fill(0x2c2c30);
			// net drape
			g.poly([w * 0.5, y, w * 0.6, y, w * 0.55, y - 34]).fill({ color: 0x2f5d5d, alpha: 0.85 });
			// lamp post + glow
			g.rect(w * 0.88, y - 92, 6, 92).fill(0x1f1f22);
			g.circle(w * 0.88 + 3, y - 94, 22).fill({ color: 0xffbf66, alpha: 0.15 });
			g.circle(w * 0.88 + 3, y - 94, 10).fill(0xffd98a);
		}
	},
	{
		id: "lighting",
		covers: "Lighting (grade)",
		draw: (g, { width: w, height: h }) => {
			g.rect(0, 0, w, h).fill({ color: 0xff9d4d, alpha: 0.06 });
			g.rect(0, 0, w, h * 0.14).fill({ color: 0x0a1120, alpha: 0.35 });
			g.rect(0, h * 0.86, w, h * 0.14).fill({ color: 0x0a1120, alpha: 0.4 });
			g.rect(0, 0, w * 0.06, h).fill({ color: 0x0a1120, alpha: 0.3 });
			g.rect(w * 0.94, 0, w * 0.06, h).fill({ color: 0x0a1120, alpha: 0.3 });
		}
	}
];
