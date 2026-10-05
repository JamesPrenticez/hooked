import { useCallback, useEffect, useState } from "react";
import { type Application, UPDATE_PRIORITY } from "pixi.js";

import { initSession } from "@api";
import { recoverFromServer } from "@components/system/roundRecovery";
import { MIN_LOADING_MS } from "@constants/config";
import { pixiAppRef } from "@hooks/use-canvas-freeze";
import { useGameStore } from "@stores/gameStore";
import { loadBootAssets } from "@utils/bootAssets";

/**
 * Drives the loading → game transition (BUILD_PLAN §0.2): advance only once
 * every boot asset has loaded, Pixi has rendered its first frame AND
 * MIN_LOADING_MS has passed (so the loading screen is actually seen).
 * Returns the onInit handler to pass to <Application> and the 0–1 load progress.
 */
export function useGameBootstrap() {
	const setPhase = useGameStore(state => state.setPhase);
	const [progress, setProgress] = useState(0);
	const [assetsLoaded, setAssetsLoaded] = useState(false);
	const [frameRendered, setFrameRendered] = useState(false);
	const [minElapsed, setMinElapsed] = useState(false);

	useEffect(() => {
		const id = setTimeout(() => setMinElapsed(true), MIN_LOADING_MS);
		return () => clearTimeout(id);
	}, []);

	useEffect(() => {
		let live = true;
		loadBootAssets(p => live && setProgress(p))
			.catch(error => console.error("Error loading assets:", error))
			.then(() => live && setAssetsLoaded(true));
		return () => {
			live = false;
		};
	}, []);

	// Session + authoritative balance/round (§30); nothing else ever populates balanceStore.
	useEffect(() => {
		initSession()
			.then(recoverFromServer)
			.catch(error => console.error("Error starting session:", error));
	}, []);

	useEffect(() => {
		if (assetsLoaded && frameRendered && minElapsed) setPhase("game");
	}, [assetsLoaded, frameRendered, minElapsed, setPhase]);

	const onInit = useCallback((app: Application) => {
		pixiAppRef.current = app;
		// UTILITY runs after the TickerPlugin's render (registered at LOW), so
		// this only fires once that first frame has actually been drawn.
		app.ticker.addOnce(() => setFrameRendered(true), undefined, UPDATE_PRIORITY.UTILITY);
	}, []);

	return { onInit, progress };
}
