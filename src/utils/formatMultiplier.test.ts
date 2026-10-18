import { expect, it } from "vitest";

import { formatMultiplier } from "./formatMultiplier";

it("writes a multiplier the way the server pays it, without trailing zeros", () => {
	expect(formatMultiplier(1.5)).toBe("1.5");
	expect(formatMultiplier(0.07)).toBe("0.07");
	expect(formatMultiplier(12.35)).toBe("12.35");
	expect(formatMultiplier(250)).toBe("250");
	expect(formatMultiplier(100)).toBe("100");
});

it("never rounds a price off the cent it is paid at", () => {
	// 12.35 must not read ×12.3 or ×12.4 — the payout is stake × 12.35.
	expect(formatMultiplier(Number("12.35"))).toBe("12.35");
	expect(formatMultiplier(Number("0.10"))).toBe("0.1");
});
