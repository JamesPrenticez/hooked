import { useEffect, useMemo, useState } from "react";
import { Assets, Rectangle, Texture } from "pixi.js";

import { KRAKEN_SHEETS } from "@constants/krakenAnimations";

import { krakenFrameRect } from "./krakenFrames";
import { SHEET_URLS } from "./krakenSheets";

/** Every cell of a Kraken sheet as a texture set in its grid box (`krakenFrameRect`), numbered as the manifest's
 *  frames are — `undefined` until the sheet has loaded. */
export function useKrakenFrames(sheetId: string): Texture[] | undefined {
	const [loaded, setLoaded] = useState<{ id: string; texture: Texture }>();
	useEffect(() => {
		let live = true;
		Assets.load<Texture>(SHEET_URLS[sheetId]).then(texture => {
			if (live) setLoaded({ id: sheetId, texture });
		});
		return () => {
			live = false;
		};
	}, [sheetId]);

	return useMemo(() => {
		if (loaded?.id !== sheetId) return undefined;
		const sheet = KRAKEN_SHEETS.find(({ id }) => id === sheetId)!;
		return Array.from({ length: sheet.columns * sheet.rows }, (_, frame) => {
			const r = krakenFrameRect(sheet.id, sheet.columns, sheet.rows, frame);
			return new Texture({
				source: loaded.texture.source,
				frame: new Rectangle(r.x, r.y, r.width, r.height),
				orig: new Rectangle(0, 0, r.boxWidth, r.boxHeight),
				trim: new Rectangle(r.trimX, r.trimY, r.width, r.height)
			});
		});
	}, [loaded, sheetId]);
}
