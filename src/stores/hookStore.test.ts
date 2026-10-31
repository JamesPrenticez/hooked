import { expect, it } from "vitest";

import { useHookStore } from "./hookStore";

it("defaults to auto and switches mode", () => {
	expect(useHookStore.getState().hookMode).toBe("auto");
	useHookStore.getState().setHookMode("manual");
	expect(useHookStore.getState().hookMode).toBe("manual");
	useHookStore.getState().setHookMode("auto");
});

it("leaves the multiplier to the round until the debug panel sets one", () => {
	expect(useHookStore.getState().multiplier).toBeUndefined();
	useHookStore.getState().setMultiplier(250);
	expect(useHookStore.getState().multiplier).toBe(250);
	useHookStore.getState().setMultiplier(undefined);
});
