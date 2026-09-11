import { useEffect, useState } from "react";
import { useApplication } from "@pixi/react";
import { Assets, type Texture } from "pixi.js";

import bgDesktopUrl from "@/assets/layers/hub/background/bg-desktop.webp";
import bgLightsDesktopUrl from "@/assets/layers/hub/background/bg-lights-desktop.webp";
import bgLightsMobileUrl from "@/assets/layers/hub/background/bg-lights-mobile.webp";
import bgMobileUrl from "@/assets/layers/hub/background/bg-mobile.webp";
import { useDayNightClock } from "@/hooks/useDayNightClock";
import { useElapsedSeconds } from "@/hooks/useElapsedSeconds";

import { computeAmbience } from "./ambience";
import BackgroundLayer from "./BackgroundLayer";
import CelestialBody from "./CelestialBody";
import OceanLayer from "./OceanLayer";
import SkyLayer from "./SkyLayer";

/**
 * The harbour / main hub scene (BUILD_PLAN §7.1) — the game's home state
 * between rounds.
 *
 * Real art lands one layer at a time. The background strip (`bg-desktop` /
 * `bg-mobile`, picked by viewport shape — see `backgroundFit`) is in and
 * carries the buildings, dock and cranes. The sky, sun / moon and overall
 * light level are code, cycled through a day / night loop by
 * `useDayNightClock` + `computeAmbience` — the strip is painted at midday
 * and tinted from there. Only the `ocean` placeholder from `layers.ts`
 * still renders, filling the strip's transparent lower zone until real
 * water art replaces it; the other placeholders stay in `layers.ts` as the
 * spec for their own passes (docs/ASSETS.md).
 *
 * §7.2 fisherman and §7.3 ambient activity are separate sub-milestones and
 * are not here yet.
 */
function HarbourScene() {
	const { app, isInitialised } = useApplication();
	const [textures, setTextures] = useState<Record<string, Texture>>();
	const t = useDayNightClock();
	const seconds = useElapsedSeconds();

	useEffect(() => {
		let live = true;
		// ponytail: loaded on scene mount, not via the boot manifest — one small
		// pop the first time the hub shows. Route through §5's Assets.load(manifest)
		// when the harbour asset set is real.
		Assets.load([bgDesktopUrl, bgMobileUrl, bgLightsDesktopUrl, bgLightsMobileUrl]).then(loaded => {
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

	return (
		<pixiContainer>
			<SkyLayer view={view} skyTop={skyTop} skyHorizon={skyHorizon} />
			<OceanLayer view={view} tint={bgTint} />
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
		</pixiContainer>
	);
}

export default HarbourScene;
