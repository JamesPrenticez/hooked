import { Assets, type Texture } from "pixi.js";

import bgDesktopUrl from "@assets/background/bg-desktop.webp";
import bgMobileUrl from "@assets/background/bg-mobile.webp";
import boomSegmentUrl from "@assets/dock-crane/boom-segment.webp";
import boomTipUrl from "@assets/dock-crane/boom-tip.webp";
import towerUrl from "@assets/dock-crane/tower.webp";
import helicopterUrl from "@assets/helicopter/helicopter.webp";
import seamUrl from "@assets/layers/hub/water/seam.webp";
import causticsUrl from "@assets/layers/hub/water/underwater-caustics.webp";
import shaftsUrl from "@assets/layers/hub/water/underwater-shafts.webp";
import waterTileUrl from "@assets/layers/hub/water/water-tile.webp";
import hookUrl from "@assets/player/hook.webp";
import basicSheetUrl from "@assets/player/player-idle-cast-reel.webp";
import extendedSheetUrl from "@assets/player/player-succes-fail.webp";
import { SHEET_URLS } from "@components/descent-scene/krakenSheets";
import { SHEETS } from "@constants/fish";
import { KRAKEN_ANIMATIONS, KRAKEN_FIGHT } from "@constants/krakenAnimations";

/** Textures drawn well under their source size get mipmaps so fine detail doesn't shimmer. */
export const mipmapped = (src: string) => ({
	src,
	data: { autoGenerateMipmaps: true }
});

/** Everything the game scenes draw from the first frame, so nothing pops in after the loading screen. */
const BOOT_ASSETS = [
	bgDesktopUrl,
	bgMobileUrl,
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
	...SHEETS.map(s => s.url),
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
