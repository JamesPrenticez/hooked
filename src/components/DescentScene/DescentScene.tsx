import { useEffect, useState } from "react";
import { useApplication } from "@pixi/react";
import { Assets, type Texture } from "pixi.js";

import waterColumnBottomUrl from "@assets/underwater/water-column-2560x4800-bottom.png";
import waterColumnTopUrl from "@assets/underwater/water-column-2560x4800-top.png";
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
 * The underwater environment (BUILD_PLAN §11/§13) — the water-column art,
 * depth-zone markers and the line/hook placeholder (the boat/player/rod
 * stay behind in HarbourScene, at the surface), all driven off `depth`.
 * No fish, no target outcome, no server round yet: this is the visual
 * descent loop only.
 */
function DescentScene({ depth }: DescentSceneProps) {
	const { app, isInitialised } = useApplication();
	const seconds = useElapsedSeconds();
	const [textures, setTextures] = useState<Record<string, Texture>>();

	useEffect(() => {
		let live = true;
		Assets.load([waterColumnTopUrl, waterColumnBottomUrl]).then(loaded => {
			if (live) setTextures(loaded);
		});
		return () => {
			live = false;
		};
	}, []);

	if (!isInitialised) return null;

	const view = { width: app.screen.width, height: app.screen.height };
	const ambience = computeDepthAmbience(depth);

	return (
		<pixiContainer>
			<WaterLayer
				view={view}
				textureTop={textures?.[waterColumnTopUrl]}
				textureBottom={textures?.[waterColumnBottomUrl]}
				depth={depth}
				darkness={ambience.darkness}
			/>
			<DepthMarkers view={view} depth={depth} />
			<FishingLine view={view} depth={depth} seconds={seconds} />
		</pixiContainer>
	);
}

export default DescentScene;
