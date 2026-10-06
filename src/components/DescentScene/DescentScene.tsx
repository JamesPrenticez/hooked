import { useEffect } from "react";
import { useApplication } from "@pixi/react";

import { cameraScroll, waterlineY } from "@components/HarbourScene/framing";
import { KRAKEN_DEPTH_METERS } from "@constants/depthZones";
import { useDebugStore } from "@stores/debugStore";

import { Creatures } from "./Creatures";
import { computeDepthAmbience } from "./depthAmbience";
import { DepthMarkers } from "./DepthMarkers";
import { HitboxOverlay } from "./HitboxOverlay";
import { Kraken } from "./Kraken";
import { preloadKrakenFight } from "./krakenSheets";
import { WaterLayer } from "./WaterLayer";
import { WaterTiles } from "./WaterTiles";

interface DescentSceneProps {
	/** Metres below the boat — owned by App so the HTML depth readout can
	 *  share the same number (`useDescentDepth`). */
	depth: number;
	/** Wall-clock seconds — HarbourScene's clock, so the Kraken and the hook the
	 *  fishing line draws stay in step. */
	seconds: number;
	/** Where the water's surface is on screen when the harbour has been pulled back for a landing; unset, at rest. */
	surfaceY?: number;
}

/**
 * The underwater environment (BUILD_PLAN §11/§13) — water gradient with its
 * caustic / light-shaft tiles, depth-zone markers and the sea creatures (shrimp to
 * whale), all driven off `depth`.
 * It's the bottom third of the harbour screen at rest and sits behind
 * HarbourScene's layers, which scroll up off it as the cast plays out
 * (`framing.ts`) — so the harbour and the descent are one continuous world,
 * not two scenes crossfaded. The boat, rod and fishing line stay with the
 * harbour. No catch mechanic, target outcome or server round yet: this is the
 * visual descent loop only.
 */
export function DescentScene({ depth, seconds, surfaceY }: DescentSceneProps) {
	const { app, isInitialised } = useApplication();
	const depthZones = useDebugStore(state => state.depthZones);
	const depthUnit = useDebugStore(state => state.depthUnit);
	// No server-picked jackpot outcome exists yet, so for now every round that
	// reaches the bottom of the trench fights the Kraken.
	const bossEncounter = depth >= KRAKEN_DEPTH_METERS;
	const descending = depth > 0;
	useEffect(() => {
		if (descending) preloadKrakenFight();
	}, [descending]);

	if (!isInitialised) return null;

	const view = { width: app.screen.width, height: app.screen.height };
	const ambience = computeDepthAmbience(depth, depthZones);
	const scroll = cameraScroll(depth, view);
	const waterY = Math.max(0, (surfaceY ?? waterlineY(view)) - scroll);

	return (
		<pixiContainer>
			<WaterLayer
				view={view}
				y={waterY}
				top={ambience.waterTop}
				bottom={ambience.waterBottom}
				darkness={ambience.darkness}
			/>
			<WaterTiles view={view} y={waterY} scroll={scroll} ambience={ambience} seconds={seconds} />
			<DepthMarkers view={view} depth={depth} zones={depthZones} unit={depthUnit} />
			<Creatures view={view} depth={depth} seconds={seconds} />
			<HitboxOverlay view={view} depth={depth} />
			{bossEncounter && <Kraken view={view} seconds={seconds} />}
		</pixiContainer>
	);
}
