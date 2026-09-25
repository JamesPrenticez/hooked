import { describe, expect, it } from "vitest";

import { SIM_VERSION } from "./simConfig";
import {
	canonicalBytes,
	decodeInputs,
	encodeInputs,
	fromBase64,
	MAX_RECORDING_TICKS,
	type Recording,
	toBase64
} from "./simRecording";

const recording = (over: Partial<Recording> = {}): Recording => ({
	simVersion: SIM_VERSION,
	worldSeed: 4_000_000_000,
	multiplier: 250,
	inputs: encodeInputs([0, 0, 1, 1, 1, -1]),
	result: { fish: "sardine", depthM: 0, ticks: 6 },
	...over
});

describe("encodeInputs / decodeInputs", () => {
	it("round-trips a stream, runs of any length included", () => {
		const axes = [...Array(300).fill(0), 1, ...Array(5).fill(-1), 0, 1, 1];
		expect([...decodeInputs(encodeInputs(axes))]).toEqual(axes);
	});

	it("codes a whole run in a few bytes, however long", () => {
		expect(encodeInputs(Array(10).fill(0))).toHaveLength(1);
		expect(encodeInputs(Array(8000).fill(0))).toHaveLength(3);
	});

	it("is empty for no ticks", () => {
		expect(encodeInputs([])).toHaveLength(0);
		expect(decodeInputs(new Uint8Array())).toHaveLength(0);
	});

	it("refuses an axis that isn't −1, 0 or +1", () => {
		expect(() => encodeInputs([0, 2])).toThrow(/axis/);
	});

	it("rejects malformed bytes", () => {
		expect(() => decodeInputs(Uint8Array.of(0x80))).toThrow(/truncated/);
		expect(() => decodeInputs(Uint8Array.of(0x01))).toThrow(/malformed/); // a run of no ticks
		expect(() => decodeInputs(Uint8Array.of(0x07))).toThrow(/malformed/); // axis code 3
	});

	it("won't expand past the limit — a few bytes must not become a huge array", () => {
		const bomb = encodeInputs(Array(MAX_RECORDING_TICKS + 1).fill(0));
		expect(bomb.length).toBeLessThan(5);
		expect(() => decodeInputs(bomb)).toThrow(/longer than/);
		expect(decodeInputs(encodeInputs(Array(MAX_RECORDING_TICKS).fill(0)))).toHaveLength(MAX_RECORDING_TICKS);
	});
});

describe("canonicalBytes", () => {
	it("is stable, and whatever the client claims it caught doesn't change it", () => {
		const a = canonicalBytes(recording());
		expect(a).toEqual(canonicalBytes(recording()));
		expect(a).toEqual(canonicalBytes(recording({ result: { fish: "whale", depthM: 1, ticks: 99 } })));
	});

	it("changes with anything that changes the run", () => {
		const base = canonicalBytes(recording());
		for (const over of [
			{ simVersion: SIM_VERSION + 1 },
			{ worldSeed: 4_000_000_001 },
			{ multiplier: 251 },
			{ inputs: encodeInputs([0, 0, 1, 1, 1, 1]) }
		]) {
			expect(canonicalBytes(recording(over))).not.toEqual(base);
		}
	});
});

describe("base64", () => {
	it("round-trips every byte value", () => {
		const bytes = Uint8Array.from({ length: 256 }, (_, i) => i);
		expect(fromBase64(toBase64(bytes))).toEqual(bytes);
	});
});
