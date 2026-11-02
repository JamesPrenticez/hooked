import { useMemo, useState } from "react";
import { useApplication } from "@pixi/react";

import bgDesktopUrl from "@assets/background/bg-desktop.webp";
import bgMobileUrl from "@assets/background/bg-mobile.webp";
import boomSegmentUrl from "@assets/dock-crane/boom-segment.webp";
import boomTipUrl from "@assets/dock-crane/boom-tip.webp";
import towerUrl from "@assets/dock-crane/tower.webp";
import helicopterUrl from "@assets/helicopter/helicopter.webp";
import seamUrl from "@assets/layers/hub/water/seam.webp";
import waterTileUrl from "@assets/layers/hub/water/water-tile.webp";
import basicSheetUrl from "@assets/player/player-idle-cast-reel.webp";
import extendedSheetUrl from "@assets/player/player-succes-fail.webp";
import { DescentScene } from "@components/descent-scene";
import { Creatures } from "@components/descent-scene/Creatures";
import { FishingLine } from "@components/descent-scene/FishingLine";
import { HookedKraken } from "@components/descent-scene/HookedKraken";
import { layout } from "@constants/harbourLayout";
import { useAnimatedNumber } from "@hooks/useAnimatedNumber";
import { useElapsedSeconds } from "@hooks/useElapsedSeconds";
import { useHookStore } from "@stores/hookStore";
import { usePlayerStore } from "@stores/playerStore";
import { cachedTextures } from "@utils/loadAssets";

import { BackgroundLayer } from "./BackgroundLayer";
import { DockCrane } from "./DockCrane";
import {
	cameraShake,
	hookPose,
	LANDING_SURFACE_Y,
	landingPivotY,
	type LandingScene,
	landingScene,
	ROD_GROW
} from "./extraction";
import { Fisherman } from "./Fisherman";
import { boatLayout, cameraScroll, hookWorldY, rodTipShift, waterlineY } from "./framing";
import { Helicopter } from "./Helicopter";
import { IdleFish } from "./IdleFish";
import { OceanLayer } from "./OceanLayer";
import { buildPlayerFrames } from "./playerFrames";
import { SeamWaves } from "./SeamWaves";
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
 * Real art lands one layer at a time. The static background (`bg-desktop` /
 * `bg-mobile`, picked by viewport shape — see `backgroundFit`) is in and
 * carries the sky, buildings and docks.
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
	bgDesktopUrl,
	bgMobileUrl,
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
	const [textures] = useState(() => cachedTextures(HARBOUR_URLS));
	const seconds = useElapsedSeconds();
	const sim = useHookStore(state => state.sim);
	const shift = rodTipShift(usePlayerStore(state => state.cue.animation));
	// How the landing has moved the boat, the crane and the camera from how the harbour rests. Each eases to where
	// the landing puts it, so when the round ends the harbour settles back to rest instead of snapping.
	const landing = landingScene(sim);
	const scene: LandingScene = {
		station: useAnimatedNumber(landing.station),
		retire: useAnimatedNumber(landing.retire),
		crane: useAnimatedNumber(landing.crane),
		zoom: useAnimatedNumber(landing.zoom),
		drop: useAnimatedNumber(landing.drop),
		line: useAnimatedNumber(landing.line),
		grow: useAnimatedNumber(landing.grow)
	};
	const grow = 1 + (ROD_GROW - 1) * scene.grow;

	const player = useMemo(
		() =>
			textures &&
			buildPlayerFrames({
				basic: textures[basicSheetUrl],
				extended: textures[extendedSheetUrl]
			}),
		[textures]
	);

	// Children mount before <Application>'s async init resolves.
	if (!isInitialised) return null;

	const view = { width: app.screen.width, height: app.screen.height };
	const waterline = layout("waterline", view);
	const scroll = cameraScroll(depth, view);
	const laidOut = player && boatLayout(view, waterSwell(seconds), scene);
	// The fisherman is nudged and resized about the boat's anchor (`Fisherman`), so the rod tip moves with him.
	const p = layout("player", view);
	const boat = laidOut && {
		...laidOut,
		tip: {
			x: laidOut.x + p.x + (laidOut.tip.x - laidOut.x) * p.scale + shift.x * laidOut.scale * p.scale,
			y: laidOut.y + p.y + (laidOut.tip.y - laidOut.y) * p.scale + shift.y * laidOut.scale * p.scale
		}
	};
	// Where the hook hangs, which is no longer where the camera is once a fish is on it: it stays at
	// the depth it was caught while the camera goes up, then is hauled to the surface and lifted out.
	const posed = sim && boat ? hookPose(sim, view, boat.tip) : undefined;
	// The debug waterline moves the surface the fish comes out of with it.
	const hook = posed && {
		...posed,
		surfaceY: posed.surfaceY === undefined ? undefined : posed.surfaceY + waterline.y
	};
	const shake = sim ? cameraShake(sim) : { x: 0, y: 0 };
	// The camera pulls back about a point near the top of the screen, so the crane's jib stays high and the harbour falls away below it.
	const seam = waterlineY(view);
	const pivotY = landingPivotY(view);
	// Over any landing the water’s surface drops away down the screen, so the fish comes right out of it. In world
	// space that is further down the more the camera has pulled out.
	const landed = pivotY + (LANDING_SURFACE_Y * view.height - pivotY) / scene.zoom;
	const surface = seam + (landed - seam) * scene.drop + waterline.y;

	return (
		<pixiContainer x={shake.x} y={shake.y}>
			<DescentScene depth={depth} seconds={seconds} surfaceY={pivotY + (surface - pivotY) * scene.zoom} />
			<pixiContainer x={(view.width / 2) * (1 - scene.zoom)} y={pivotY * (1 - scene.zoom)} scale={scene.zoom}>
				{/* The harbour layers have nothing to draw once the camera has scrolled them
				    off-screen, but the fishing line and hook follow the hook down. */}
				<pixiContainer y={-scroll}>
					<pixiContainer visible={scroll < seam}>
						<OceanLayer view={view} surface={surface} texture={textures?.[waterTileUrl]} seconds={seconds} />
						<BackgroundLayer view={view} desktop={textures?.[bgDesktopUrl]} mobile={textures?.[bgMobileUrl]} />
						<SeamWaves surface={surface} view={view} texture={textures?.[seamUrl]} seconds={seconds} />
						{/* Part of the harbour, just chilling until a catch is too heavy for the rod — and then out in front of it. */}
						<DockCrane
							view={view}
							textures={{
								tower: textures?.[towerUrl],
								segment: textures?.[boomSegmentUrl],
								tip: textures?.[boomTipUrl]
							}}
							out={scene.crane}
							hook={hook}
						/>
						{/* Called in over the crane for a heavier catch, and the Chinook over it for a heavier one still. */}
						<Helicopter view={view} texture={textures?.[helicopterUrl]} hook={hook} />
						<Helicopter view={view} texture={textures?.[helicopterUrl]} hook={hook} heavy />
					</pixiContainer>
					<IdleFish view={view} seconds={seconds} scatter={!!sim || depth > 0} />
					{player && boat && <Fisherman frames={player} boat={boat} seconds={seconds} view={view} grow={grow} />}
					{/* After the boat, so the line and hook draw in front of it. */}
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
				</pixiContainer>
				{/* Above the hook: the hooked fish overlaps it. */}
				<Creatures view={view} depth={depth} seconds={seconds} hook={hook} onlyHooked />
				<HookedKraken view={view} depth={depth} hook={hook} />
			</pixiContainer>
		</pixiContainer>
	);
}
