import { expect, it } from "vitest";

import { useHookStore } from "./hookStore";

it("defaults to auto and switches mode", () => {
	expect(useHookStore.getState().hookMode).toBe("auto");
	useHookStore.getState().setHookMode("manual");
	expect(useHookStore.getState().hookMode).toBe("manual");
	useHookStore.getState().setHookMode("auto");
});
