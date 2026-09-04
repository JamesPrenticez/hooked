import { useEffect, useRef, useState } from "react";

const FADE_MS = 300;

export interface CrossfadeOutgoing<K> {
	key: K;
	alpha: number;
}

/**
 * Tracks the key + alpha of the scene fading OUT after `activeKey` changes.
 * Drives off requestAnimationFrame rather than Pixi's ticker so it's
 * testable without a renderer (ARCHITECTURE Rule 11) — SceneManager just
 * renders whatever this returns.
 */
export function useCrossfade<K>(activeKey: K): CrossfadeOutgoing<K> | null {
	const [outgoing, setOutgoing] = useState<CrossfadeOutgoing<K> | null>(null);
	const previousKey = useRef(activeKey);

	useEffect(() => {
		if (previousKey.current === activeKey) return;
		const fadingKey = previousKey.current;
		previousKey.current = activeKey;

		const start = performance.now();
		let frame: number;

		const tick = (now: number) => {
			const alpha = 1 - Math.min(1, (now - start) / FADE_MS);
			if (alpha <= 0) {
				setOutgoing(null);
				return;
			}
			setOutgoing({ key: fadingKey, alpha });
			frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);

		return () => cancelAnimationFrame(frame);
	}, [activeKey]);

	return outgoing;
}
