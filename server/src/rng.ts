// Provably-fair RNG (ARCHITECTURE.md §36). A round outcome derives
// deterministically from (serverSeed, clientSeed, nonce): same triple in,
// same outcome out, every time — that is the proof. POST /api/game/verify
// recomputes it. The client never runs this; it has no hidden RNG (§17).

import { createHash, createHmac, randomBytes } from "node:crypto";

/** 32 random bytes as hex — a fresh server or client seed. */
export function generateSeed(): string {
	return randomBytes(32).toString("hex");
}

/** SHA-256 hex of a seed — the commitment published before play. */
export function hashSeed(seed: string): string {
	return createHash("sha256").update(seed).digest("hex");
}

/**
 * Deterministic, unbounded byte stream. Block N is
 * HMAC-SHA256(serverSeed, "<clientSeed>:<nonce>:<N>"); blocks are yielded
 * byte-by-byte and concatenated as the caller pulls more.
 */
export function* byteStream(serverSeed: string, clientSeed: string, nonce: number): Generator<number, never> {
	for (let block = 0; ; block++) {
		yield* createHmac("sha256", serverSeed).update(`${clientSeed}:${nonce}:${block}`).digest();
	}
}

/**
 * Uniform integer in [0, max) drawn from the stream. Reads 4 bytes as a
 * uint32 and rejection-samples the top partial bucket, so there is no modulo
 * bias.
 */
export function rollInt(stream: Generator<number>, max: number): number {
	if (!Number.isInteger(max) || max < 1) throw new RangeError("max must be a positive integer");
	const limit = Math.floor(0x1_0000_0000 / max) * max;
	for (;;) {
		const a = stream.next().value as number;
		const b = stream.next().value as number;
		const c = stream.next().value as number;
		const d = stream.next().value as number;
		const v = ((a * 256 + b) * 256 + c) * 256 + d; // 0 .. 2^32-1
		if (v < limit) return v % max;
	}
}

/**
 * Weighted index draw from the stream. `weights[i]` is the relative chance of
 * returning `i`; they must be non-negative integers with a positive sum
 * (constants.ts keeps them so). Rolls a uniform int on the weight sum via
 * rollInt, so it inherits the no-modulo-bias guarantee.
 */
export function rollWeighted(stream: Generator<number>, weights: number[]): number {
	const total = weights.reduce((sum, w) => sum + w, 0);
	if (weights.length === 0 || !weights.every(w => Number.isInteger(w) && w >= 0) || total < 1) {
		throw new RangeError("weights must be non-negative integers with a positive sum");
	}
	let roll = rollInt(stream, total);
	for (let i = 0; i < weights.length; i++) {
		roll -= weights[i];
		if (roll < 0) return i;
	}
	return weights.length - 1; // unreachable: roll started < total === sum(weights)
}

/** Fisher–Yates shuffle of `items` in place, drawn from the stream: every ordering is equally likely (rollInt has no
 *  modulo bias). Returns `items`. */
export function shuffle<T>(stream: Generator<number>, items: T[]): T[] {
	for (let i = items.length - 1; i > 0; i--) {
		const j = rollInt(stream, i + 1);
		[items[i], items[j]] = [items[j], items[i]];
	}
	return items;
}
