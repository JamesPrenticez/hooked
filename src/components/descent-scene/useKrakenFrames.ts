import { useMemo } from "react";
import { Assets, Rectangle, Texture } from "pixi.js";

import { KRAKEN_SHEETS } from "@constants/krakenAnimations";

import { krakenFrameRect } from "./krakenFrames";
import { SHEET_URLS } from "./krakenSheets";

/** Every cell of a Kraken sheet as a texture set in its grid box (`krakenFrameRect`), numbered as the manifest's
 *  frames are — `undefined` if the boot load didn't cache the sheet. */
export function useKrakenFrames(sheetId: string): Texture[] | undefined {
	const texture = Assets.get<Texture>(SHEET_URLS[sheetId]);

	return useMemo(() => {
		if (!texture) return undefined;
		const sheet = KRAKEN_SHEETS.find(({ id }) => id === sheetId)!;
		return Array.from({ length: sheet.columns * sheet.rows }, (_, frame) => {
			const r = krakenFrameRect(sheet.id, sheet.columns, sheet.rows, frame);
			return new Texture({
				source: texture.source,
				frame: new Rectangle(r.x, r.y, r.width, r.height),
				orig: new Rectangle(0, 0, r.boxWidth, r.boxHeight),
				trim: new Rectangle(r.trimX, r.trimY, r.width, r.height)
			});
		});
	}, [texture, sheetId]);
}
