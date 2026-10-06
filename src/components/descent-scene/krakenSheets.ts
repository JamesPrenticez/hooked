import { Assets } from "pixi.js";

import krak1 from "@assets/kraken/krak-1.png";
import krak2 from "@assets/kraken/krak-2.png";
import krak3 from "@assets/kraken/krak-3.png";
import krak4 from "@assets/kraken/krak-4.png";
import krak5 from "@assets/kraken/krak-5.png";
import krak6 from "@assets/kraken/krak-6.png";
import krak7 from "@assets/kraken/krak-7.png";
import { KRAKEN_ANIMATIONS, KRAKEN_FIGHT, KRAKEN_SHEETS } from "@constants/krakenAnimations";

/** Sheet id → image, in the order `kraken-animations.json` lists them. */
export const SHEET_URLS: Record<string, string> = Object.fromEntries(
	[krak1, krak2, krak3, krak4, krak5, krak6, krak7].map((url, i) => [KRAKEN_SHEETS[i].id, url])
);

/** Starts fetching the fight's sheet (~3MB) so it's ready by the time the hook reaches the trench. */
export function preloadKrakenFight() {
	void Assets.load(SHEET_URLS[KRAKEN_ANIMATIONS[KRAKEN_FIGHT[0]].sheet]);
}
