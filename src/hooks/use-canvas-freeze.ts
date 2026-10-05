import { useEffect } from "react";
import { type Application, UPDATE_PRIORITY } from "pixi.js";

// Set once from App.tsx's onInit. The full-screen overlays are HTML siblings of
// the canvas rather than children of it, so they sit outside @pixi/react's
// Application context and cannot reach the app via useApplication(). Mirrors
// the viewportRef pattern in gameStore.
export const pixiAppRef: { current: Application | null } = { current: null };

// Refcounted: overlays can stack (bonus modal -> automine modal), so rendering
// only resumes once the last one unmounts.
let freezeCount = 0;

/**
 * Stops the Pixi *render* while a full-screen overlay covers the canvas.
 *
 * Pixi registers rendering as an ordinary ticker listener (see TickerPlugin),
 * so removing it leaves the ticker itself running — every useTick callback
 * still fires and game logic is untouched. Only the draw is skipped.
 *
 * Two costs disappear while frozen: the WebGL render, and the browser's re-blur
 * of any `backdrop-filter` sitting over the canvas. A backdrop-filter is
 * expensive only because the content behind it keeps changing — hold the canvas
 * still and WebRender caches the blurred result instead of recomputing it (and
 * re-rasterising the whole viewport) every frame.
 */
export const useCanvasFreeze = (active: boolean) => {
	useEffect(() => {
		if (!active) return;
		const app = pixiAppRef.current;
		if (!app) return;

		if (freezeCount++ === 0) app.ticker.remove(app.render, app);

		return () => {
			if (--freezeCount === 0) app.ticker.add(app.render, app, UPDATE_PRIORITY.LOW);
		};
	}, [active]);
};
