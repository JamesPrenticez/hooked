import { useEffect, useRef } from "react";

import { useHookStore } from "@stores/hookStore";

const ARROWS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"];
/** Descent-speed multipliers for the ↑ (slow) and ↓ (fast) keys. */
export const SLOW_RATE = 0.5;
export const FAST_RATE = 6;

const isTyping = (target: EventTarget | null) =>
	target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName));

/**
 * Held arrows as a steering `axis` (←/→, −1 / 0 / +1) and a descent `rate` (↑ slow, ↓ fast, 1 otherwise), read
 * through the returned getters so the sim samples them once per tick rather than per event. Ignores key repeats,
 * typing, and the open debug dialog; releases everything on blur. The held set is mirrored to `hookStore.heldKeys`.
 */
export function useHookKeys(enabled: boolean): { axis: () => number; rate: () => number } {
	const held = useRef(new Set<string>());

	useEffect(() => {
		if (!enabled) return;
		const keys = held.current;
		const publish = () => useHookStore.setState({ heldKeys: [...keys] });
		const onDown = (e: KeyboardEvent) => {
			if (!ARROWS.includes(e.key)) return;
			if (e.repeat || isTyping(e.target) || document.querySelector("dialog[open]")) return;
			e.preventDefault();
			keys.add(e.key);
			publish();
		};
		const onUp = (e: KeyboardEvent) => {
			keys.delete(e.key);
			publish();
		};
		const clear = () => {
			keys.clear();
			publish();
		};

		window.addEventListener("keydown", onDown);
		window.addEventListener("keyup", onUp);
		window.addEventListener("blur", clear);
		document.addEventListener("visibilitychange", clear);
		return () => {
			window.removeEventListener("keydown", onDown);
			window.removeEventListener("keyup", onUp);
			window.removeEventListener("blur", clear);
			document.removeEventListener("visibilitychange", clear);
			clear();
		};
	}, [enabled]);

	const has = (key: string) => (held.current.has(key) ? 1 : 0);
	return {
		axis: () => has("ArrowRight") - has("ArrowLeft"),
		rate: () => (has("ArrowUp") ? SLOW_RATE : 1) * (has("ArrowDown") ? FAST_RATE : 1)
	};
}
