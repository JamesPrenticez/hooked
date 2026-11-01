import { Assets } from "pixi.js";

import krak1 from "@assets/kraken/krak-1.webp";
import krak2 from "@assets/kraken/krak-2.webp";
import krak3 from "@assets/kraken/krak-3.webp";
import krak4 from "@assets/kraken/krak-4.webp";
import krak5 from "@assets/kraken/krak-5.webp";
import krak6 from "@assets/kraken/krak-6.webp";
import krak7 from "@assets/kraken/krak-7.webp";
import { KRAKEN_ANIMATIONS, KRAKEN_FIGHT, KRAKEN_SHEETS, KRAKEN_SWIM } from "@constants/krakenAnimations";

/** Sheet id → image, in the order `kraken-animations.json` lists them. */
export const SHEET_URLS: Record<string, string> = Object.fromEntries(
	[krak1, krak2, krak3, krak4, krak5, krak6, krak7].map((url, i) => [KRAKEN_SHEETS[i].id, url])
);

/** Starts fetching the fight's and the swim's sheets (~3MB each) so they're ready by the time the hook reaches the trench. */
export function preloadKrakenFight() {
	for (const id of [KRAKEN_FIGHT[0], KRAKEN_SWIM]) void Assets.load(SHEET_URLS[KRAKEN_ANIMATIONS[id].sheet]);
}
