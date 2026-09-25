import { useEffect, useMemo, useState } from "react";
import { useApplication } from "@pixi/react";
import { Assets } from "pixi.js";

import craneUrl from "@assets/dock-crane/dock-crane-static.png";
import helicopterUrl from "@assets/helicopter/helicopter.png";
import bgDesktopUrl from "@assets/layers/hub/background/bg-desktop.webp";
import bgLightsDesktopUrl from "@assets/layers/hub/background/bg-lights-desktop.webp";
import bgLightsMobileUrl from "@assets/layers/hub/background/bg-lights-mobile.webp";
import bgMobileUrl from "@assets/layers/hub/background/bg-mobile.webp";
import seamUrl from "@assets/layers/hub/water/seam.png";
import waterTileUrl from "@assets/layers/hub/water/water-tile.webp";
import basicSheetUrl from "@assets/player/player-idle-cast-reel.png";
import extendedSheetUrl from "@assets/player/player-succes-fail.png";
import { DescentScene } from "@components/DescentScene";
import { Creatures } from "@components/DescentScene/Creatures";
import { FishingLine } from "@components/DescentScene/FishingLine";
import { useDayNightClock } from "@hooks/useDayNightClock";
import { useElapsedSeconds } from "@hooks/useElapsedSeconds";
import { useHookStore } from "@stores/hookStore";
import { cachedTextures, mipmapped } from "@utils/bootAssets";

import { computeAmbience } from "./ambience";
import { BackgroundLayer } from "./BackgroundLayer";
import { CelestialBody } from "./CelestialBody";
import { DockCrane } from "./DockCrane";
import { cameraShake, hookPose } from "./extraction";
import { Fisherman } from "./Fisherman";
import { boatLayout, cameraScroll, hookWorldY, waterlineY } from "./framing";
import { Helicopter } from "./Helicopter";
import { OceanLayer } from "./OceanLayer";
import { buildPlayerFrames } from "./playerFrames";
import { SeamWaves } from "./SeamWaves";
import { SkyLayer } from "./SkyLayer";
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
 * `Fisherman` (§7.2) is the boat + player, animated from two placeholder sprite
 * sheets and cued by `usePlayerStore`. §7.3 ambient activity is a separate
 * sub-milestone and is not here yet.
 */
interface HarbourSceneProps {
	/** Metres below the boat — owned by App so the HTML depth readout can share
	 *  the same number (`useDescentDepth`). `0` is the idle harbour. */
	depth?: number;
}

const HARBOUR_URLS = [
	bgDesktopUrl,
	bgMobileUrl,
	bgLightsDesktopUrl,
	bgLightsMobileUrl,
	waterTileUrl,
	seamUrl,
	basicSheetUrl,
	extendedSheetUrl,
	craneUrl,
	helicopterUrl
];

export function HarbourScene({ depth = 0 }: HarbourSceneProps) {
	const { app, isInitialised } = useApplication();
	const [textures, setTextures] = useState(() => cachedTextures(HARBOUR_URLS));
	const t = useDayNightClock();
	const seconds = useElapsedSeconds();
	const sim = useHookStore(state => state.sim);

	useEffect(() => {
		let live = true;
		// ponytail: loaded on scene mount, not via the boot manifest — one small
		// pop the first time the hub shows. Route through §5's Assets.load(manifest)
		// when the harbour asset set is real.
		// The water tile is drawn ~1-3x smaller than its 1024px source, so it gets
		// mipmaps. The player sheets are drawn larger than their 256px frames, so
		// they don't.
		Assets.load([
			bgDesktopUrl,
			bgMobileUrl,
			bgLightsDesktopUrl,
			bgLightsMobileUrl,
			mipmapped(waterTileUrl),
			mipmapped(seamUrl),
			basicSheetUrl,
			extendedSheetUrl,
			// Both are drawn at well under a third of their source size.
			mipmapped(craneUrl),
			mipmapped(helicopterUrl)
		]).then(loaded => {
			if (live) setTextures(loaded);
		});
		return () => {
			live = false;
		};
	}, []);

	const player = useMemo(
		() => textures && buildPlayerFrames({ basic: textures[basicSheetUrl], extended: textures[extendedSheetUrl] }),
		[textures]
	);

	// Children mount before <Application>'s async init resolves.
	if (!isInitialised) return null;

	const view = { width: app.screen.width, height: app.screen.height };
	const { skyTop, skyHorizon, bgTint, windowGlow, celestial } = computeAmbience(t, view);
	const scroll = cameraScroll(depth, view);
	const boat = player && boatLayout(view, waterSwell(seconds));
	// Where the hook hangs, which is no longer where the camera is once a fish is on it: it stays at
	// the depth it was caught while the camera goes up, then is hauled to the surface and lifted out.
	const hook = sim && boat ? hookPose(sim, view, boat.tip) : undefined;
	const shake = sim ? cameraShake(sim) : { x: 0, y: 0 };

	return (
		<pixiContainer x={shake.x} y={shake.y}>
			<DescentScene depth={depth} tint={bgTint} seconds={seconds} />
			{/* The harbour layers have nothing to draw once the camera has scrolled them
			    off-screen, but the fishing line and hook follow the hook down. */}
			<pixiContainer y={-scroll}>
				<pixiContainer visible={scroll < waterlineY(view)}>
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
					<SeamWaves view={view} tint={bgTint} texture={textures?.[seamUrl]} seconds={seconds} />
					{/* Part of the harbour, just chilling until a catch is too heavy for the rod. */}
					<DockCrane view={view} texture={textures?.[craneUrl]} tint={bgTint} hook={hook} />
					<Helicopter view={view} texture={textures?.[helicopterUrl]} tint={bgTint} hook={hook} seconds={seconds} />
				</pixiContainer>
				{boat && (
					<FishingLine
						tip={boat.tip}
						hookY={hook?.y ?? hookWorldY(depth, boat.tip.y, view)}
						hookX={hook?.x}
						scroll={scroll}
						waterY={waterlineY(view)}
						view={view}
						boatScale={boat.scale}
						seconds={seconds}
					/>
				)}
				{player && boat && <Fisherman frames={player} boat={boat} tint={bgTint} seconds={seconds} />}
			</pixiContainer>
			{/* Screen space, above the hook: the hooked fish overlaps it. */}
			<Creatures view={view} depth={depth} seconds={seconds} hook={hook} onlyHooked />
		</pixiContainer>
	);
}
