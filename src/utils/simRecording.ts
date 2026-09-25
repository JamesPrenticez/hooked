import type { SimResult } from "./simStep.ts";

/**
 * One finished run: everything that fixes it (`worldSeed`, `multiplier` and the per-tick steering) plus what it
 * caught. The hook path is the inputs, lossless; the fish paths are the world seed. Part of the shared sim core:
 * runs in Node, so no `Buffer`.
 */
export interface Recording {
	simVersion: number;
	worldSeed: number;
	multiplier: number;
	/** Per-tick steering axis (−1 / 0 / +1), run-length coded by `encodeInputs`. */
	inputs: Uint8Array;
	/** What the run caught. Derived — the server re-simulates and never trusts a client's. */
	result: SimResult;
}

/** The longest run a decoder will expand (10 minutes). A real descent to the Kraken is ≈2½ minutes. */
export const MAX_RECORDING_TICKS = 60 * 600;

/** LEB128: 7 bits a byte, low first. Arithmetic, not shifts, so it holds past 2³¹ (a uint32 world seed). */
function pushVarint(out: number[], value: number): void {
	while (value >= 128) {
		out.push((value % 128) + 128);
		value = Math.floor(value / 128);
	}
	out.push(value);
}

function readVarint(bytes: Uint8Array, at: number): [value: number, next: number] {
	let value = 0;
	let scale = 1;
	for (let i = at; i < bytes.length && i < at + 5; i++) {
		value += (bytes[i] % 128) * scale;
		if (bytes[i] < 128) return [value, i + 1];
		scale *= 128;
	}
	throw new Error("truncated varint");
}

/** Run-length codes an axis stream: one varint per run, `length·4 + axis + 1`. */
export function encodeInputs(axes: ArrayLike<number>): Uint8Array {
	const out: number[] = [];
	for (let i = 0; i < axes.length;) {
		const axis = axes[i];
		if (axis !== -1 && axis !== 0 && axis !== 1) throw new Error(`axis must be -1, 0 or 1, got ${axis}`);
		let end = i + 1;
		while (end < axes.length && axes[end] === axis) end++;
		pushVarint(out, (end - i) * 4 + axis + 1);
		i = end;
	}
	return Uint8Array.from(out);
}

/** The inverse of `encodeInputs`. Throws on anything malformed, or longer than `maxTicks`. */
export function decodeInputs(bytes: Uint8Array, maxTicks = MAX_RECORDING_TICKS): Int8Array {
	const axes: number[] = [];
	for (let at = 0; at < bytes.length;) {
		const [code, next] = readVarint(bytes, at);
		at = next;
		const axis = (code % 4) - 1;
		const length = Math.floor(code / 4);
		if (axis > 1 || length === 0) throw new Error("malformed run");
		if (axes.length + length > maxTicks) throw new Error(`longer than ${maxTicks} ticks`);
		for (let i = 0; i < length; i++) axes.push(axis);
	}
	return Int8Array.from(axes);
}

/**
 * What a recording is hashed and de-duplicated by: the inputs that fix the run, not `result`, which they derive.
 * Two runs that steer alike are the same bytes.
 */
export function canonicalBytes({ simVersion, worldSeed, multiplier, inputs }: Recording): Uint8Array {
	const head: number[] = [];
	pushVarint(head, simVersion);
	pushVarint(head, worldSeed);
	pushVarint(head, multiplier);
	const out = new Uint8Array(head.length + inputs.length);
	out.set(head);
	out.set(inputs, head.length);
	return out;
}

// btoa/atob, not Buffer — the codec runs in the browser and in Node.
export const toBase64 = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes));

export const fromBase64 = (text: string): Uint8Array => Uint8Array.from(atob(text), char => char.charCodeAt(0));
