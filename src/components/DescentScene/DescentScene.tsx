import { useApplication } from "@pixi/react";

import { useElapsedSeconds } from "@hooks/useElapsedSeconds";

import { computeDepthAmbience } from "./depthAmbience";
import DepthMarkers from "./DepthMarkers";
import FishingLine from "./FishingLine";
import ParallaxLayer from "./ParallaxLayer";
import WaterLayer from "./WaterLayer";

interface DescentSceneProps {
	/** Metres below the boat — owned by App so the HTML depth readout can
	 *  share the same number (`useDescentDepth`). */
	depth: number;
}

// Back (slow, dim) to front (fast, bright) — the differential drift speed is
// what reads as parallax, not the dot styling.
const PARALLAX_LAYERS = [
	{ count: 18, speed: 900, seed: 1, alpha: 0.25, color: 0xbfe9ff },
	{ count: 12, speed: 500, seed: 2, alpha: 0.4, color: 0xdff6ff },
	{ count: 8, speed: 240, seed: 3, alpha: 0.6, color: 0xffffff }
];

/**
 * The underwater environment (BUILD_PLAN §11/§13) — water gradient, a
 * layered particle parallax, depth-zone markers and the line/hook
 * placeholder (the boat/player/rod stay behind in HarbourScene, at the
 * surface), all driven off `depth`. No fish, no target outcome, no server
 * round yet: this is the visual descent loop only.
 */
function DescentScene({ depth }: DescentSceneProps) {
	const { app, isInitialised } = useApplication();
	const seconds = useElapsedSeconds();

	if (!isInitialised) return null;

	const view = { width: app.screen.width, height: app.screen.height };
	const ambience = computeDepthAmbience(depth);

	return (
		<pixiContainer>
			<WaterLayer view={view} top={ambience.waterTop} bottom={ambience.waterBottom} darkness={ambience.darkness} />
			{PARALLAX_LAYERS.map(layer => (
				<ParallaxLayer key={layer.seed} view={view} depth={depth} {...layer} />
			))}
			<DepthMarkers view={view} depth={depth} />
			<FishingLine view={view} depth={depth} seconds={seconds} />
		</pixiContainer>
	);
}

export default DescentScene;
