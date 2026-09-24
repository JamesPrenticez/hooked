import { useEffect, useRef } from "react";

const isTyping = (target: EventTarget | null) =>
	target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName));

/**
 * Held ←/→ as a steering axis (−1 / 0 / +1), read through the returned getter so
 * the sim samples it once per tick rather than per event. Ignores key repeats,
 * typing, and the open debug dialog; releases everything on blur.
 */
export function useHookKeys(enabled: boolean): () => number {
	const held = useRef(new Set<string>());

	useEffect(() => {
		if (!enabled) return;
		const keys = held.current;
		const onDown = (e: KeyboardEvent) => {
			if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
			if (e.repeat || isTyping(e.target) || document.querySelector("dialog[open]")) return;
			e.preventDefault();
			keys.add(e.key);
		};
		const onUp = (e: KeyboardEvent) => keys.delete(e.key);
		const clear = () => keys.clear();

		window.addEventListener("keydown", onDown);
		window.addEventListener("keyup", onUp);
		window.addEventListener("blur", clear);
		document.addEventListener("visibilitychange", clear);
		return () => {
			window.removeEventListener("keydown", onDown);
			window.removeEventListener("keyup", onUp);
			window.removeEventListener("blur", clear);
			document.removeEventListener("visibilitychange", clear);
			keys.clear();
		};
	}, [enabled]);

	return () => (held.current.has("ArrowRight") ? 1 : 0) - (held.current.has("ArrowLeft") ? 1 : 0);
}
