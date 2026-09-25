import { Assets, type Texture } from "pixi.js";

import boomSegmentUrl from "@assets/dock-crane/boom-segment.png";
import boomTipUrl from "@assets/dock-crane/boom-tip.png";
import towerUrl from "@assets/dock-crane/tower.png";
import helicopterUrl from "@assets/helicopter/helicopter.png";
import bgDesktopWideUrl from "@assets/layers/hub/background/bg-desktop-wide.png";
import bgMobileWideUrl from "@assets/layers/hub/background/bg-mobile-wide.png";
import seamUrl from "@assets/layers/hub/water/seam.png";
import causticsUrl from "@assets/layers/hub/water/underwater-caustics.webp";
import shaftsUrl from "@assets/layers/hub/water/underwater-shafts.webp";
import waterTileUrl from "@assets/layers/hub/water/water-tile.webp";
import hookUrl from "@assets/player/hook.png";
import basicSheetUrl from "@assets/player/player-idle-cast-reel.png";
import extendedSheetUrl from "@assets/player/player-succes-fail.png";
import { SPECIES } from "@components/DescentScene/creatureSpecies";
import { SHEET_URLS } from "@components/DescentScene/krakenSheets";
import { KRAKEN_ANIMATIONS, KRAKEN_FIGHT } from "@constants/krakenAnimations";

/** Textures drawn well under their source size get mipmaps so fine detail doesn't shimmer. */
export const mipmapped = (src: string) => ({
	src,
	data: { autoGenerateMipmaps: true }
});

/** Everything the game scenes draw from the first frame, so nothing pops in after the loading screen. */
const BOOT_ASSETS = [
	bgDesktopWideUrl,
	bgMobileWideUrl,
	mipmapped(waterTileUrl),
	mipmapped(seamUrl),
	basicSheetUrl,
	extendedSheetUrl,
	mipmapped(causticsUrl),
	mipmapped(shaftsUrl),
	mipmapped(hookUrl),
	// All drawn at well under a third of their source size.
	mipmapped(towerUrl),
	mipmapped(boomSegmentUrl),
	mipmapped(boomTipUrl),
	mipmapped(helicopterUrl),
	...SPECIES.map(s => s.url),
	SHEET_URLS[KRAKEN_ANIMATIONS[KRAKEN_FIGHT[0]].sheet]
];

/** Loads every boot asset, reporting 0–1 progress. */
export function loadBootAssets(onProgress: (progress: number) => void) {
	return Assets.load(BOOT_ASSETS, onProgress);
}

/** The textures for `urls` if the boot load already cached them all — lets a scene draw on its first render. */
export function cachedTextures(urls: string[]): Record<string, Texture> | undefined {
	return urls.every(url => Assets.cache.has(url))
		? Object.fromEntries(urls.map(url => [url, Assets.get<Texture>(url)]))
		: undefined;
}
