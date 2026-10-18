import { useEffect, useMemo, useState } from "react";
import { Assets, Rectangle, Texture } from "pixi.js";

import { BITE, cellRect, SHEET_ROWS, type SheetAnimation, STRUGGLE } from "@components/descent-scene/spriteSheet";
import { type Sheet, SHEETS } from "@constants/fish";
import { cachedTextures } from "@utils/bootAssets";

export interface SheetFrames {
	swim: Texture[];
	bite: Texture[];
	struggle: Texture[];
}

/** Swim, bite and struggle frames per sheet, once every sheet has loaded. */
export function useFrames() {
	const [sheets, setSheets] = useState(() => cachedTextures(SHEETS.map(s => s.url)));

	useEffect(() => {
		let live = true;
		// ponytail: all 14 sheets load on scene mount (~85MB of textures), not via
		// the boot manifest — same as HarbourScene; load per depth zone or route
		// through §5's manifest if memory matters.
		Assets.load<Texture>(SHEETS.map(s => s.url)).then(loaded => {
			if (live) setSheets(loaded);
		});
		return () => {
			live = false;
		};
	}, []);

	return useMemo(() => {
		if (!sheets) return undefined;
		const row = (s: Sheet, { row, frameCount }: SheetAnimation) =>
			Array.from({ length: frameCount }, (_, col) => {
				const { x, y, width, height } = cellRect(sheets[s.url], s.cols, SHEET_ROWS, row, col);
				return new Texture({
					source: sheets[s.url].source,
					frame: new Rectangle(x, y, width, height)
				});
			});
		return new Map<Sheet, SheetFrames>(
			SHEETS.map(s => [
				s,
				{
					swim: row(s, s.swim),
					bite: row(s, BITE),
					struggle: row(s, STRUGGLE)
				}
			])
		);
	}, [sheets]);
}
