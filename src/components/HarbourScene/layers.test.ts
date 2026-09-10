import type { Graphics } from "pixi.js";
import { expect, it } from "vitest";

import { HARBOUR_LAYERS } from "./layers";

/** A Graphics stand-in whose every method returns itself, so a full draw
 *  chain runs without a renderer (ARCHITECTURE Rule 11). */
function fakeGraphics(): Graphics {
	const g = new Proxy(
		{},
		{
			get:
				() =>
				(...args: unknown[]) => {
					void args;
					return g;
				}
		}
	);
	return g as unknown as Graphics;
}

it("registers the §7.1 environment layers back-to-front", () => {
	expect(HARBOUR_LAYERS.map(l => l.id)).toEqual([
		"sky",
		"buildings",
		"ocean",
		"boats",
		"dock",
		"cranes",
		"props",
		"lighting"
	]);
});

it("covers every §7.1 checklist item", () => {
	const covered = HARBOUR_LAYERS.map(l => l.covers).join(" ");
	for (const item of ["Harbour", "Dock", "Ocean", "Buildings", "Cranes", "Boats", "Props", "Lighting"]) {
		expect(covered).toContain(item);
	}
});

it("draws every layer without throwing across desktop and portrait-mobile viewports", () => {
	const g = fakeGraphics();
	for (const view of [
		{ width: 1280, height: 720 },
		{ width: 390, height: 844 },
		{ width: 844, height: 390 }
	]) {
		for (const layer of HARBOUR_LAYERS) {
			expect(() => layer.draw(g, view)).not.toThrow();
		}
	}
});
