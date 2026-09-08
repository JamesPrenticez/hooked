import { useEffect, useRef, useState } from "react";

const DURATION_MS = 600;
const easeOut = (t: number) => 1 - (1 - t) ** 3;

/**
 * Eases a displayed number toward `target` whenever it changes, over
 * ~600ms with a cubic ease-out. Retargeting mid-animation continues from
 * the value currently on screen rather than snapping. rAF-driven (not
 * Pixi's ticker) so it's testable without a renderer (ARCHITECTURE Rule
 * 11). Presentation only — the caller still owns the real value.
 */
export function useAnimatedNumber(target: number): number {
	const [value, setValue] = useState(target);

	// Mirrors the on-screen value for the tween below to start from. Written
	// only in an effect (never during render).
	const valueRef = useRef(target);
	useEffect(() => {
		valueRef.current = value;
	}, [value]);

	useEffect(() => {
		const from = valueRef.current;
		if (from === target) return;

		const start = performance.now();
		let frame: number;

		const tick = (now: number) => {
			const progress = Math.min(1, (now - start) / DURATION_MS);
			if (progress >= 1) {
				setValue(target);
				return;
			}
			setValue(from + (target - from) * easeOut(progress));
			frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);

		return () => cancelAnimationFrame(frame);
	}, [target]);

	return value;
}
