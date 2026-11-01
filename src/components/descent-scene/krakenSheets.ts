import swimSheetUrl from "@assets/kraken/krak-4.webp";
import fightSheetUrl from "@assets/kraken/krak-6.webp";

/** Sheet id → image, for the two sheets the encounter plays (`kraken-animations.json`). */
export const SHEET_URLS: Record<string, string> = {
	coiled_yanks_full_body: fightSheetUrl,
	swimming_full_body: swimSheetUrl
};
