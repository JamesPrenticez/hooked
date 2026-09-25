import { expect, it } from "vitest";

import { useHookStore } from "./hookStore";

it("defaults to auto and switches mode", () => {
	expect(useHookStore.getState().hookMode).toBe("auto");
	useHookStore.getState().setHookMode("manual");
	expect(useHookStore.getState().hookMode).toBe("manual");
	useHookStore.getState().setHookMode("auto");
});

it("catches a 1× fish by default and takes another multiplier for the next one", () => {
	expect(useHookStore.getState().multiplier).toBe(1);
	useHookStore.getState().setMultiplier(250);
	expect(useHookStore.getState().multiplier).toBe(250);
	useHookStore.getState().setMultiplier(1);
});
