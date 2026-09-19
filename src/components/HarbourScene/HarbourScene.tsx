import { useEffect, useState } from "react";
import { useApplication } from "@pixi/react";
import { Assets, type Texture } from "pixi.js";

import bgDesktopUrl from "@assets/layers/hub/background/bg-desktop.webp";
import bgLightsDesktopUrl from "@assets/layers/hub/background/bg-lights-desktop.webp";
import bgLightsMobileUrl from "@assets/layers/hub/background/bg-lights-mobile.webp";
import bgMobileUrl from "@assets/layers/hub/background/bg-mobile.webp";
import waterTileUrl from "@assets/layers/hub/water/water-tile.webp";
import playerUrl from "@assets/player/player.png";
import DescentScene from "@components/DescentScene";
import FishingLine from "@components/DescentScene/FishingLine";
import { useDayNightClock } from "@hooks/useDayNightClock";
import { useElapsedSeconds } from "@hooks/useElapsedSeconds";

import { computeAmbience } from "./ambience";
import BackgroundLayer from "./BackgroundLayer";
import CelestialBody from "./CelestialBody";
import Fisherman from "./Fisherman";
import { boatLayout, cameraScroll, hookWorldY, waterlineY } from "./framing";
import OceanLayer from "./OceanLayer";
import SkyLayer from "./SkyLayer";
import { waterSwell } from "./waterSwell";

/**
 * The harbour / main hub scene (BUILD_PLAN §7.1) — the game's home state
 * between rounds, and the whole world the cast and descent play out in.
 *
 * The screen is split in thirds (`framing.ts`): sky, city and docks on top;
 * the boat and fisherman on the harbour water in the middle; the underwater
 * (`DescentScene`) below. Casting doesn't swap scenes — the harbour layers
 * sit in one container that scrolls up by `cameraScroll(depth)`, the hook
 * falling from the rod tip into the water as it goes, until the underwater has
 * the whole screen. Ascending plays it in reverse, so the return is seamless
 * too.
 *
 * Real art lands one layer at a time. The background strip (`bg-desktop` /
 * `bg-mobile`, picked by viewport shape — see `backgroundFit`) is in and
 * carries the buildings and docks. The sky, sun / moon and overall light level
 * are code, cycled through a day / night loop by `useDayNightClock` +
 * `computeAmbience` — the strip is painted at midday and tinted from there.
 * `OceanLayer` fills the strip's transparent lower zone with a scrolling water
 * tile once it loads (falling back to the flat `ocean` placeholder from
 * `layers.ts` until then); the other placeholders stay in `layers.ts` as the
 * spec for their own passes (docs/ASSETS.md).
 *
 * `Fisherman` (§7.2) is the placeholder boat + player. §7.3 ambient activity
 * is a separate sub-milestone and is not here yet.
 */
interface HarbourSceneProps {
	/** Metres below the boat — owned by App so the HTML depth readout can share
	 *  the same number (`useDescentDepth`). `0` is the idle harbour. */
	depth?: number;
}

function HarbourScene({ depth = 0 }: HarbourSceneProps) {
	const { app, isInitialised } = useApplication();
	const [textures, setTextures] = useState<Record<string, Texture>>();
	const t = useDayNightClock();
	const seconds = useElapsedSeconds();

	useEffect(() => {
		let live = true;
		// ponytail: loaded on scene mount, not via the boot manifest — one small
		// pop the first time the hub shows. Route through §5's Assets.load(manifest)
		// when the harbour asset set is real.
		// The player still is drawn ~2-7x smaller than its 1536px source, so it gets mipmaps.
		Assets.load([
			bgDesktopUrl,
			bgMobileUrl,
			bgLightsDesktopUrl,
			bgLightsMobileUrl,
			waterTileUrl,
			{ src: playerUrl, data: { autoGenerateMipmaps: true } }
		]).then(loaded => {
			if (live) setTextures(loaded);
		});
		return () => {
			live = false;
		};
	}, []);

	// Children mount before <Application>'s async init resolves.
	if (!isInitialised) return null;

	const view = { width: app.screen.width, height: app.screen.height };
	const { skyTop, skyHorizon, bgTint, windowGlow, celestial } = computeAmbience(t, view);
	const scroll = cameraScroll(depth, view);
	const player = textures?.[playerUrl];
	const boat = player && boatLayout(view, player, waterSwell(seconds));

	return (
		<pixiContainer>
			<DescentScene depth={depth} tint={bgTint} />
			{/* Nothing to draw once the camera has scrolled the harbour off-screen. */}
			<pixiContainer y={-scroll} visible={scroll < waterlineY(view)}>
				<SkyLayer view={view} skyTop={skyTop} skyHorizon={skyHorizon} />
				<OceanLayer
					view={view}
					tint={bgTint}
					texture={textures?.[waterTileUrl]}
					seconds={seconds}
					celestial={celestial}
					windowGlow={windowGlow}
				/>
				<CelestialBody view={view} celestial={celestial} />
				<BackgroundLayer
					view={view}
					desktop={textures?.[bgDesktopUrl]}
					mobile={textures?.[bgMobileUrl]}
					litDesktop={textures?.[bgLightsDesktopUrl]}
					litMobile={textures?.[bgLightsMobileUrl]}
					tint={bgTint}
					windowGlow={windowGlow}
					seconds={seconds}
				/>
				{boat && (
					<FishingLine
						tip={boat.tip}
						hookY={hookWorldY(depth, boat.tip.y, view)}
						viewWidth={view.width}
						boatScale={boat.scale}
						depth={depth}
						seconds={seconds}
					/>
				)}
				{boat && <Fisherman texture={player} boat={boat} tint={bgTint} />}
			</pixiContainer>
		</pixiContainer>
	);
}

export default HarbourScene;
