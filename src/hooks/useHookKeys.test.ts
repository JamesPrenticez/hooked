import { fireEvent, renderHook } from "@testing-library/react";
import { expect, it } from "vitest";

import { useHookStore } from "@stores/hookStore";

import { FAST_RATE, SLOW_RATE, useHookKeys } from "./useHookKeys";

it("reads held arrows as an axis, ignores repeats and typing, clears on blur", () => {
	const { result } = renderHook(() => useHookKeys(true));
	const axis = () => result.current.axis();
	expect(axis()).toBe(0);

	fireEvent.keyDown(window, { key: "ArrowRight" });
	expect(axis()).toBe(1);
	expect(useHookStore.getState().heldKeys).toEqual(["ArrowRight"]);
	fireEvent.keyDown(window, { key: "ArrowLeft" });
	expect(axis()).toBe(0);
	fireEvent.keyUp(window, { key: "ArrowRight" });
	expect(axis()).toBe(-1);
	fireEvent.blur(window);
	expect(axis()).toBe(0);
	expect(useHookStore.getState().heldKeys).toEqual([]);

	const input = document.body.appendChild(document.createElement("input"));
	fireEvent.keyDown(input, { key: "ArrowLeft" });
	fireEvent.keyDown(window, { key: "ArrowLeft", repeat: true });
	expect(axis()).toBe(0);
	input.remove();
});

it("reads ↑ as slow, ↓ as fast, both as normal", () => {
	const { result } = renderHook(() => useHookKeys(true));
	expect(result.current.rate()).toBe(1);
	fireEvent.keyDown(window, { key: "ArrowUp" });
	expect(result.current.rate()).toBe(SLOW_RATE);
	fireEvent.keyDown(window, { key: "ArrowDown" });
	expect(result.current.rate()).toBe(SLOW_RATE * FAST_RATE);
	fireEvent.keyUp(window, { key: "ArrowUp" });
	expect(result.current.rate()).toBe(FAST_RATE);
});

it("does nothing while disabled", () => {
	const { result } = renderHook(() => useHookKeys(false));
	fireEvent.keyDown(window, { key: "ArrowRight" });
	expect(result.current.axis()).toBe(0);
});
