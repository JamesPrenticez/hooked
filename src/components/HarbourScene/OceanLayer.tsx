import { HARBOUR_LAYERS, type HarbourView } from "./layers";

const ocean = HARBOUR_LAYERS.find(layer => layer.id === "ocean");

interface OceanLayerProps {
	view: HarbourView;
	/** Day / night multiply tint from `computeAmbience`. */
	tint: number;
}

/**
 * Placeholder water filling the background strip's transparent lower zone
 * until real ocean art replaces it (docs/ASSETS.md).
 */
function OceanLayer({ view, tint }: OceanLayerProps) {
	if (!ocean) return null;
	return <pixiGraphics tint={tint} draw={g => ocean.draw(g.clear(), view)} />;
}

export default OceanLayer;
