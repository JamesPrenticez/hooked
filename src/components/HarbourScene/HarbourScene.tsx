import { useApplication } from "@pixi/react";

import { HARBOUR_LAYERS } from "./layers";

/**
 * The harbour / main hub scene (BUILD_PLAN §7.1) — the game's home state
 * between rounds. Placeholder art: each §7.1 checklist item is a flat
 * Pixi-drawn layer in `layers.ts`, back-to-front. Real webp / skeleton art
 * drops in by replacing a layer's `draw` body (see docs/ASSETS.md); the
 * layer stack and z-order stay put.
 *
 * §7.2 fisherman and §7.3 ambient activity are separate sub-milestones and
 * are not here yet.
 */
function HarbourScene() {
	const { app, isInitialised } = useApplication();
	// Children mount before <Application>'s async init resolves.
	if (!isInitialised) return null;

	const view = { width: app.screen.width, height: app.screen.height };

	return (
		<pixiContainer>
			{HARBOUR_LAYERS.map(layer => (
				<pixiGraphics key={layer.id} draw={g => layer.draw(g.clear(), view)} />
			))}
			<pixiText text="§7.1 Harbour — placeholder art" x={16} y={16} style={{ fill: "#8fa9bd", fontSize: 14 }} />
		</pixiContainer>
	);
}

export default HarbourScene;
