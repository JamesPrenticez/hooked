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

/** Textures drawn well under their source size get mipmaps so fine detail doesn't shimmer. */
const mipmapped = (src: string) => ({
	src,
	data: { autoGenerateMipmaps: true }
});

/** Everything the game scenes draw from the first frame, so nothing pops in after the loading screen. */
export const PIXI_ASSETS = [
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
	...Object.values(SHEET_URLS)
];

/** Images only the DOM draws (cast button states, bonus and volatility art, fish portraits) — `preloadImages`
 *  keeps them out of the browser's lazy fetch path. */
export const DOM_IMAGE_URLS = Object.values(
	import.meta.glob<string>(
		[
			"../assets/bonuses/*.webp",
			"../assets/bottom-bar/cast-button*.webp",
			"../assets/bottom-bar/cast-line-text.webp",
			"../assets/bottom-bar/select-targets.webp",
			"../assets/single-fish/*.webp",
			"../assets/volatility/*.{webp,svg}"
		],
		{ eager: true, query: "?url", import: "default" }
	)
);

export const FONTS = [
	'1em "Otomanopee One"',
	"400 1em Aronui",
	"700 1em Aronui",
	"italic 400 1em Aronui",
	"italic 700 1em Aronui"
];
