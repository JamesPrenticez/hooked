import { useCallback, useEffect, useState } from "react";
import { type Application, UPDATE_PRIORITY } from "pixi.js";

import { useGameStore } from "@/stores/gameStore";

/**
 * Drives the loading → tutorial transition (BUILD_PLAN §0.2): advance only
 * once the asset load has resolved AND Pixi has rendered its first frame.
 * Returns the onInit handler to pass to <Application>.
 */
export function useGameBootstrap() {
	const setPhase = useGameStore(state => state.setPhase);
	const [assetsLoaded, setAssetsLoaded] = useState(false);
	const [frameRendered, setFrameRendered] = useState(false);

	useEffect(() => {
		// ponytail: no real art yet — resolving immediately proves the load-gate
		// wiring. Swap in Assets.load(manifest) when fish/harbour/ui assets
		// land (milestone 5+).
		Promise.resolve().then(() => setAssetsLoaded(true));
	}, []);

	useEffect(() => {
		if (assetsLoaded && frameRendered) setPhase("tutorial");
	}, [assetsLoaded, frameRendered, setPhase]);

	return useCallback((app: Application) => {
		// UTILITY runs after the TickerPlugin's render (registered at LOW), so
		// this only fires once that first frame has actually been drawn.
		app.ticker.addOnce(() => setFrameRendered(true), undefined, UPDATE_PRIORITY.UTILITY);
	}, []);
}
