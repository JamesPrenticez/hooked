import { expect, it } from "vitest";

import { seededRandom } from "./simRandom";

it("is deterministic per seed and stays in [0, 1)", () => {
	const a = seededRandom(7);
	const b = seededRandom(7);
	const seq = Array.from({ length: 50 }, () => a());
	expect(seq).toEqual(Array.from({ length: 50 }, () => b()));
	expect(seq.every(n => n >= 0 && n < 1)).toBe(true);
	expect(seededRandom(8)()).not.toBe(seq[0]);
});
