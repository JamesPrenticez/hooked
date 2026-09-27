import { useEffect, useMemo, useState } from "react";
import { useApplication } from "@pixi/react";
import { Assets } from "pixi.js";

import boomSegmentUrl from "@assets/dock-crane/boom-segment.png";
import boomTipUrl from "@assets/dock-crane/boom-tip.png";
import towerUrl from "@assets/dock-crane/tower.png";
import helicopterUrl from "@assets/helicopter/helicopter.png";
import bgDesktopWideUrl from "@assets/layers/hub/background/bg-desktop-wide.png";
import bgMobileWideUrl from "@assets/layers/hub/background/bg-mobile-wide.png";
import seamUrl from "@assets/layers/hub/water/seam.png";
import waterTileUrl from "@assets/layers/hub/water/water-tile.webp";
import basicSheetUrl from "@assets/player/player-idle-cast-reel.png";
import extendedSheetUrl from "@assets/player/player-succes-fail.png";
import { DescentScene } from "@components/DescentScene";
import { Creatures } from "@components/DescentScene/Creatures";
import { FishingLine } from "@components/DescentScene/FishingLine";
import { useAnimatedNumber } from "@hooks/useAnimatedNumber";
import { useDayNightClock } from "@hooks/useDayNightClock";
import { useElapsedSeconds } from "@hooks/useElapsedSeconds";
import { useTweak } from "@stores/harbourDebugStore";
import { useHookStore } from "@stores/hookStore";
import { cachedTextures, mipmapped } from "@utils/bootAssets";

import { computeAmbience } from "./ambience";
import { BackgroundLayer } from "./BackgroundLayer";
import { CelestialBody } from "./CelestialBody";
import { DockCrane } from "./DockCrane";
import {
	cameraShake,
	hookPose,
	landingPivotY,
	type LandingScene,
	landingScene,
	landingSurface,
	ZOOM_OUT
} from "./extraction";
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
 * Real art lands one layer at a time. The background strip (`bg-desktop-wide` /
 * `bg-mobile-wide`, picked by viewport shape — see `backgroundFit`) is in and
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
 *
 * Landing a catch (`extraction.ts`) moves the harbour on from how it rests: the hook is at the middle of the
 * screen, the boat pulls back beside it and — for a catch too heavy for the rod — backs away to the sidelines
 * as the crane comes out to take it, while the camera pulls right back about a point near the top of the screen
 * (`landingScene`, eased here so it also settles back when the round ends). The harbour's layers carry on past
 * the view (`OVERSCAN`) for that.
 */
interface HarbourSceneProps {
	/** Metres below the boat — owned by App so the HTML depth readout can share
	 *  the same number (`useDescentDepth`). `0` is the idle harbour. */
	depth?: number;
}

const HARBOUR_URLS = [
	bgDesktopWideUrl,
	bgMobileWideUrl,
	waterTileUrl,
	seamUrl,
	basicSheetUrl,
	extendedSheetUrl,
	towerUrl,
	boomSegmentUrl,
	boomTipUrl,
	helicopterUrl
];

export function HarbourScene({ depth = 0 }: HarbourSceneProps) {
	const { app, isInitialised } = useApplication();
	const [textures, setTextures] = useState(() => cachedTextures(HARBOUR_URLS));
	const t = useDayNightClock();
	const seconds = useElapsedSeconds();
	const sim = useHookStore(state => state.sim);
	const waterline = useTweak("waterline");
	// How the landing has moved the boat, the crane and the camera from how the harbour rests. Each eases to where
	// the landing puts it, so when the round ends the harbour settles back to rest instead of snapping.
	const landing = landingScene(sim);
	const scene: LandingScene = {
		station: useAnimatedNumber(landing.station),
		retire: useAnimatedNumber(landing.retire),
		crane: useAnimatedNumber(landing.crane),
		zoom: useAnimatedNumber(landing.zoom),
		line: useAnimatedNumber(landing.line)
	};

	useEffect(() => {
		let live = true;
		// ponytail: loaded on scene mount, not via the boot manifest — one small
		// pop the first time the hub shows. Route through §5's Assets.load(manifest)
		// when the harbour asset set is real.
		// The water tile is drawn ~1-3x smaller than its 1024px source, so it gets
		// mipmaps. The player sheets are drawn larger than their 256px frames, so
		// they don't.
		Assets.load([
			bgDesktopWideUrl,
			bgMobileWideUrl,
			mipmapped(waterTileUrl),
			mipmapped(seamUrl),
			basicSheetUrl,
			extendedSheetUrl,
			// All drawn at well under a third of their source size.
			mipmapped(towerUrl),
			mipmapped(boomSegmentUrl),
			mipmapped(boomTipUrl),
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
	const boat = player && boatLayout(view, waterSwell(seconds), scene);
	// Where the hook hangs, which is no longer where the camera is once a fish is on it: it stays at
	// the depth it was caught while the camera goes up, then is hauled to the surface and lifted out.
	const posed = sim && boat ? hookPose(sim, view, boat.tip) : undefined;
	// The debug waterline moves the surface the fish comes out of with it.
	const hook = posed && { ...posed, surfaceY: posed.surfaceY === undefined ? undefined : posed.surfaceY + waterline.y };
	const shake = sim ? cameraShake(sim) : { x: 0, y: 0 };
	// The camera pulls back about a point near the top of the screen, so the crane's jib stays high and the harbour falls away below it.
	const seam = waterlineY(view);
	const pivotY = landingPivotY(view);
	// Over a crane landing the water’s surface drops away down the screen, so the fish comes right out of it.
	const pull = (1 - scene.zoom) / (1 - ZOOM_OUT);
	const surface = seam + (landingSurface(view) - seam) * pull + waterline.y;

	return (
		<pixiContainer x={shake.x} y={shake.y}>
			<DescentScene depth={depth} tint={bgTint} seconds={seconds} surfaceY={pivotY + (surface - pivotY) * scene.zoom} />
			<pixiContainer x={(view.width / 2) * (1 - scene.zoom)} y={pivotY * (1 - scene.zoom)} scale={scene.zoom}>
				{/* The harbour layers have nothing to draw once the camera has scrolled them
				    off-screen, but the fishing line and hook follow the hook down. */}
				<pixiContainer y={-scroll}>
					<pixiContainer visible={scroll < seam}>
						<SkyLayer view={view} skyTop={skyTop} skyHorizon={skyHorizon} />
						<OceanLayer
							view={view}
							surface={surface}
							tint={bgTint}
							texture={textures?.[waterTileUrl]}
							seconds={seconds}
							celestial={celestial}
							windowGlow={windowGlow}
						/>
						<CelestialBody view={view} celestial={celestial} />
						<BackgroundLayer
							view={view}
							desktopWide={textures?.[bgDesktopWideUrl]}
							mobileWide={textures?.[bgMobileWideUrl]}
							tint={bgTint}
						/>
						<SeamWaves surface={surface} view={view} tint={bgTint} texture={textures?.[seamUrl]} seconds={seconds} />
						{/* Part of the harbour, just chilling until a catch is too heavy for the rod — and then out in front of it. */}
						<DockCrane
							view={view}
							textures={{
								tower: textures?.[towerUrl],
								segment: textures?.[boomSegmentUrl],
								tip: textures?.[boomTipUrl]
							}}
							tint={bgTint}
							out={scene.crane}
							hook={hook}
						/>
						{/* Called in over the crane for a heavier catch, and the Chinook over it for a heavier one still. */}
						<Helicopter view={view} texture={textures?.[helicopterUrl]} tint={bgTint} hook={hook} />
						<Helicopter view={view} texture={textures?.[helicopterUrl]} tint={bgTint} hook={hook} heavy />
					</pixiContainer>
					{boat && (
						<FishingLine
							tip={boat.tip}
							hookY={hook?.y ?? hookWorldY(depth, boat.tip.y, view)}
							hookX={hook?.x}
							scroll={scroll}
							waterY={surface}
							view={view}
							boatScale={boat.restScale}
							seconds={seconds}
							lineAlpha={scene.line}
						/>
					)}
					{player && boat && <Fisherman frames={player} boat={boat} tint={bgTint} seconds={seconds} />}
				</pixiContainer>
				{/* Above the hook: the hooked fish overlaps it. */}
				<Creatures view={view} depth={depth} seconds={seconds} hook={hook} onlyHooked />
			</pixiContainer>
		</pixiContainer>
	);
}
