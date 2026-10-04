import { describe, expect, it } from "vitest";

import { viewBreakpoint } from "./breakpoint";

describe("viewBreakpoint", () => {
	it("is desktop for a desktop window", () => {
		expect(viewBreakpoint({ width: 1280, height: 720 })).toBe("desktop");
	});

	it("is mobilePortrait for a portrait phone", () => {
		expect(viewBreakpoint({ width: 412, height: 915 })).toBe("mobilePortrait");
	});

	it("is mobileLandscape for a landscape phone, even though it's wider than the tablet gate", () => {
		expect(viewBreakpoint({ width: 915, height: 412 })).toBe("mobileLandscape");
	});

	it("is desktop for a landscape tablet that clears both gates", () => {
		expect(viewBreakpoint({ width: 1024, height: 768 })).toBe("desktop");
	});
});
