import { useApplication } from "@pixi/react";

import { useElapsedSeconds } from "@hooks/useElapsedSeconds";

import { computeDepthAmbience } from "./depthAmbience";
import DepthMarkers from "./DepthMarkers";
import FishingLine from "./FishingLine";
import WaterLayer from "./WaterLayer";

interface DescentSceneProps {
	/** Metres below the boat — owned by App so the HTML depth readout can
	 *  share the same number (`useDescentDepth`). */
	depth: number;
}

/**
 * The underwater environment (BUILD_PLAN §11/§13) — water gradient,
 * depth-zone markers and the line/hook placeholder (the boat/player/rod
 * stay behind in HarbourScene, at the surface), all driven off `depth`.
 * No fish, no target outcome, no server round yet: this is the visual
 * descent loop only.
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
			<DepthMarkers view={view} depth={depth} />
			<FishingLine view={view} depth={depth} seconds={seconds} />
		</pixiContainer>
	);
}

export default DescentScene;
