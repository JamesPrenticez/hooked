import { describe, expect, it } from "vitest";

import { TICK_HZ } from "./simConfig";
import {
	ascentDepth,
	ascentTicks,
	CHINOOK_FROM,
	CRANE_FROM,
	extractionAt,
	extractionTicks,
	type Gear,
	gearsFor,
	HELICOPTER_FROM,
	MAX_MULTIPLIER,
	MIN_MULTIPLIER,
	shownMultiplier
} from "./simExtraction";

const CATCH_M = 2400;

/** Every tick of a landing, in order. */
function landing(gears: Gear[]) {
	return Array.from({ length: extractionTicks(gears, CATCH_M) + 1 }, (_, tick) => extractionAt(gears, CATCH_M, tick));
}

describe("gearsFor", () => {
	it("lands a 1× catch with the rod alone", () => {
		expect(gearsFor(MIN_MULTIPLIER)).toEqual(["rod"]);
	});

	it("calls in the crane, then the helicopter, then the Chinook, as the catch gets heavier", () => {
		expect(gearsFor(CRANE_FROM)).toEqual(["rod", "crane"]);
		expect(gearsFor(HELICOPTER_FROM)).toEqual(["rod", "crane", "helicopter"]);
		expect(gearsFor(MAX_MULTIPLIER)).toEqual(["rod", "crane", "helicopter", "chinook"]);
	});

	it("only ever adds gear as the multiplier grows", () => {
		let last = 0;
		for (let m = MIN_MULTIPLIER; m <= MAX_MULTIPLIER; m++) {
			const count = gearsFor(m).length;
			expect(count).toBeGreaterThanOrEqual(last);
			last = count;
		}
		expect(gearsFor(CHINOOK_FROM - 1)).toHaveLength(3);
		expect(gearsFor(CHINOOK_FROM)).toHaveLength(4);
	});
});

describe("ascentTicks", () => {
	it("is quick, but slower for a deeper catch, and never instant", () => {
		expect(ascentTicks(10)).toBeGreaterThanOrEqual(TICK_HZ);
		expect(ascentTicks(9000)).toBeGreaterThan(ascentTicks(2000));
		expect(ascentTicks(11_400)).toBeLessThanOrEqual(4 * TICK_HZ);
	});
});

describe("ascentDepth", () => {
	it("carries the camera from the catch depth up to the surface and never back down", () => {
		const total = ascentTicks(CATCH_M);
		expect(ascentDepth(CATCH_M, 0)).toBe(CATCH_M);
		expect(ascentDepth(CATCH_M, total)).toBe(0);
		expect(ascentDepth(CATCH_M, total * 2)).toBe(0);
		for (let tick = 1; tick <= total; tick++) {
			expect(ascentDepth(CATCH_M, tick)).toBeLessThanOrEqual(ascentDepth(CATCH_M, tick - 1));
		}
	});
});

describe("extractionAt", () => {
	it("starts at the catch depth with nothing out of the water and no gear called", () => {
		for (const gears of [gearsFor(1), gearsFor(CRANE_FROM), gearsFor(500)]) {
			expect(extractionAt(gears, CATCH_M, 0)).toEqual({
				stage: "haul",
				depthM: CATCH_M,
				reveal: 0,
				arrival: { crane: 0, helicopter: 0, chinook: 0 },
				strain: 0
			});
		}
	});

	it("hauls the hook up to the surface before any of the fish shows", () => {
		const frames = landing(gearsFor(1));
		const surfaced = frames.findIndex(f => f.depthM === 0);
		expect(surfaced).toBeGreaterThan(0);
		for (const [tick, f] of frames.entries()) {
			if (f.stage === "haul") expect(f.reveal).toBe(0);
			if (tick > surfaced) expect(f.depthM).toBe(0);
			if (tick > 0) expect(f.depthM).toBeLessThanOrEqual(frames[tick - 1].depthM);
		}
	});

	it.each([1, CRANE_FROM, HELICOPTER_FROM, CHINOOK_FROM])(
		"slowly and steadily brings a %i× fish fully out, then holds",
		multiplier => {
			const frames = landing(gearsFor(multiplier));
			for (let i = 1; i < frames.length; i++) expect(frames[i].reveal).toBeGreaterThanOrEqual(frames[i - 1].reveal);
			expect(frames.at(-1)).toMatchObject({ stage: "hold", reveal: 1 });
			// A "slow" reveal: no tick shows more than a sliver of the fish arriving at once.
			for (let i = 1; i < frames.length; i++) expect(frames[i].reveal - frames[i - 1].reveal).toBeLessThan(0.02);
		}
	);

	it("hands over from the rod to the crane to the helicopter, in that order, never back", () => {
		const order = (multiplier: number) => [...new Set(landing(gearsFor(multiplier)).map(f => f.stage))];
		expect(order(1)).toEqual(["haul", "rod", "hold"]);
		expect(order(CRANE_FROM)).toEqual(["haul", "rod", "crane", "hold"]);
		expect(order(HELICOPTER_FROM)).toEqual(["haul", "rod", "crane", "helicopter", "hold"]);
		expect(order(CHINOOK_FROM)).toEqual(["haul", "rod", "crane", "helicopter", "chinook", "hold"]);
	});

	it("holds the fish where it is while the next gear is called in", () => {
		const frames = landing(gearsFor(CRANE_FROM));
		const calling = frames.filter(f => f.stage === "crane" && f.arrival.crane > 0 && f.arrival.crane < 1);
		expect(calling.length).toBeGreaterThan(0);
		expect(new Set(calling.map(f => f.reveal)).size).toBe(1);
		// The rod took the lips out of the water before the crane was needed, and no more.
		expect(calling[0].reveal).toBeGreaterThan(0);
		expect(calling[0].reveal).toBeLessThan(0.2);
	});

	it("gives the crane time to come out and get its cable down before it lifts", () => {
		const calling = landing(gearsFor(CRANE_FROM)).filter(f => f.stage === "crane" && f.arrival.crane < 1);
		expect(calling.length).toBeGreaterThanOrEqual(2 * TICK_HZ);
	});

	it("lifts a crane catch out slowly, never more than a fifth of it in a second, so it feels heavy", () => {
		const frames = landing(gearsFor(CRANE_FROM));
		for (let i = TICK_HZ; i < frames.length; i++) {
			expect(frames[i].reveal - frames[i - TICK_HZ].reveal).toBeLessThan(0.2);
		}
	});

	it("only calls in the gear the catch needs", () => {
		const arrivalAtEnd = (multiplier: number) => {
			const frames = landing(gearsFor(multiplier));
			return frames[frames.length - 1].arrival;
		};
		expect(arrivalAtEnd(1)).toEqual({ crane: 0, helicopter: 0, chinook: 0 });
		expect(arrivalAtEnd(CRANE_FROM)).toEqual({ crane: 1, helicopter: 0, chinook: 0 });
		expect(arrivalAtEnd(500)).toEqual({ crane: 1, helicopter: 1, chinook: 1 });
	});

	it("takes longer the heavier the catch", () => {
		expect(extractionTicks(gearsFor(CRANE_FROM), CATCH_M)).toBeGreaterThan(extractionTicks(gearsFor(1), CATCH_M));
		expect(extractionTicks(gearsFor(HELICOPTER_FROM), CATCH_M)).toBeGreaterThan(
			extractionTicks(gearsFor(CRANE_FROM), CATCH_M)
		);
		expect(extractionTicks(gearsFor(CHINOOK_FROM), CATCH_M)).toBeGreaterThan(
			extractionTicks(gearsFor(HELICOPTER_FROM), CATCH_M)
		);
	});

	it("gives the finished catch a beat to hang there before the round ends", () => {
		const held = landing(gearsFor(500)).filter(f => f.stage === "hold");
		expect(held.length).toBeGreaterThan(TICK_HZ);
	});

	it("makes each gear strain against a stuck fish, building to the moment it gives", () => {
		const frames = landing(gearsFor(500));
		for (const gear of ["rod", "crane", "helicopter", "chinook"]) {
			const turn = frames.filter(f => f.stage === gear);
			const stuck = turn.filter(f => f.strain > 0);
			expect(stuck.length).toBeGreaterThanOrEqual(TICK_HZ);
			// It pulls hardest right before the fish gives, and the fish hasn't moved while it does.
			expect(stuck.at(-1)?.strain).toBeCloseTo(1, 1);
			expect(new Set(stuck.map(f => f.reveal)).size).toBe(1);
			// Once it lifts, the pull is over.
			expect(turn.at(-1)?.strain).toBe(0);
		}
	});

	it("doesn't strain a catch the rod lands alone, or one that is hung and held", () => {
		expect(landing(gearsFor(1)).every(f => f.strain === 0)).toBe(true);
		expect(
			landing(gearsFor(500))
				.filter(f => f.stage === "hold")
				.every(f => f.strain === 0)
		).toBe(true);
	});
});

describe("shownMultiplier", () => {
	it("climbs from 1× to the catch's own multiplier as the fish comes out", () => {
		expect(shownMultiplier(62, 0)).toBe(MIN_MULTIPLIER);
		expect(shownMultiplier(62, 0.5)).toBeGreaterThan(MIN_MULTIPLIER);
		expect(shownMultiplier(62, 0.5)).toBeLessThan(62);
		expect(shownMultiplier(62, 1)).toBe(62);
	});

	it("lands on a multiplier with decimals exactly, as the market pays it", () => {
		expect(shownMultiplier(6.35, 1)).toBe(6.35);
		expect(shownMultiplier(100.5, 1)).toBe(100.5);
	});

	it("shows a catch worth less than the stake as itself the whole way — it has nowhere to climb to", () => {
		for (const reveal of [0, 0.3, 1]) expect(shownMultiplier(0.25, reveal)).toBe(0.25);
	});
});

describe("the gear thresholds", () => {
	it("are in the order of the gear they call in, and inside the range the market pays", () => {
		expect(MIN_MULTIPLIER).toBeLessThan(CRANE_FROM);
		expect(CRANE_FROM).toBeLessThan(HELICOPTER_FROM);
		expect(HELICOPTER_FROM).toBeLessThan(CHINOOK_FROM);
		expect(CHINOOK_FROM).toBeLessThan(MAX_MULTIPLIER);
	});

	it("land a catch worth less than the stake with the rod alone", () => {
		expect(gearsFor(0.25)).toEqual(["rod"]);
	});
});
