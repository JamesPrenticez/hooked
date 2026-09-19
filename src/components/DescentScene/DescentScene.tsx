import { useApplication } from "@pixi/react";

import { cameraScroll, waterlineY } from "@components/HarbourScene/framing";
import { MAX_DEPTH_METERS } from "@constants/depthZones";
import { useElapsedSeconds } from "@hooks/useElapsedSeconds";
import { useDebugStore } from "@stores/debugStore";
import { useKrakenStore } from "@stores/krakenStore";

import { computeDepthAmbience } from "./depthAmbience";
import DepthMarkers from "./DepthMarkers";
import Kraken from "./Kraken";
import Mackerel from "./Mackerel";
import WaterLayer from "./WaterLayer";
import WaterTiles from "./WaterTiles";

interface DescentSceneProps {
	/** Metres below the boat — owned by App so the HTML depth readout can
	 *  share the same number (`useDescentDepth`). */
	depth: number;
	/** Day / night multiply tint from `computeAmbience`. */
	tint: number;
}

/**
 * The underwater environment (BUILD_PLAN §11/§13) — water gradient with its
 * caustic / light-shaft tiles, depth-zone markers and the first fish (a
 * mackerel), all driven off `depth`.
 * It's the bottom third of the harbour screen at rest and sits behind
 * HarbourScene's layers, which scroll up off it as the cast plays out
 * (`framing.ts`) — so the harbour and the descent are one continuous world,
 * not two scenes crossfaded. The boat, rod and fishing line stay with the
 * harbour. No catch mechanic, target outcome or server round yet: this is the
 * visual descent loop only.
 */
function DescentScene({ depth, tint }: DescentSceneProps) {
	const { app, isInitialised } = useApplication();
	const seconds = useElapsedSeconds();
	const depthZones = useDebugStore(state => state.depthZones);
	const depthUnit = useDebugStore(state => state.depthUnit);
	// No server-picked jackpot outcome exists yet, so only the debug panel's
	// forced trench dive summons the Kraken (it never shows on a normal round).
	const bossEncounter = useKrakenStore(state => state.forceTrench) && depth >= MAX_DEPTH_METERS;

	if (!isInitialised) return null;

	const view = { width: app.screen.width, height: app.screen.height };
	const ambience = computeDepthAmbience(depth, depthZones);
	const scroll = cameraScroll(depth, view);
	const waterY = Math.max(0, waterlineY(view) - scroll);

	return (
		<pixiContainer>
			<WaterLayer
				view={view}
				y={waterY}
				top={ambience.waterTop}
				bottom={ambience.waterBottom}
				darkness={ambience.darkness}
				tint={tint}
			/>
			<WaterTiles view={view} y={waterY} scroll={scroll} ambience={ambience} tint={tint} seconds={seconds} />
			<DepthMarkers view={view} depth={depth} zones={depthZones} unit={depthUnit} />
			<Mackerel view={view} depth={depth} seconds={seconds} />
			{bossEncounter && <Kraken view={view} seconds={seconds} />}
		</pixiContainer>
	);
}

export default DescentScene;
