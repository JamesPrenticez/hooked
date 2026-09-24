import { fireEvent, renderHook } from "@testing-library/react";
import { expect, it } from "vitest";

import { useHookKeys } from "./useHookKeys";

it("reads held arrows as an axis, ignores repeats and typing, clears on blur", () => {
	const { result } = renderHook(() => useHookKeys(true));
	expect(result.current()).toBe(0);

	fireEvent.keyDown(window, { key: "ArrowRight" });
	expect(result.current()).toBe(1);
	fireEvent.keyDown(window, { key: "ArrowLeft" });
	expect(result.current()).toBe(0);
	fireEvent.keyUp(window, { key: "ArrowRight" });
	expect(result.current()).toBe(-1);
	fireEvent.blur(window);
	expect(result.current()).toBe(0);

	const input = document.body.appendChild(document.createElement("input"));
	fireEvent.keyDown(input, { key: "ArrowLeft" });
	fireEvent.keyDown(window, { key: "ArrowLeft", repeat: true });
	expect(result.current()).toBe(0);
	input.remove();
});

it("does nothing while disabled", () => {
	const { result } = renderHook(() => useHookKeys(false));
	fireEvent.keyDown(window, { key: "ArrowRight" });
	expect(result.current()).toBe(0);
});
