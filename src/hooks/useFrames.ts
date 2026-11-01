import { useMemo, useState } from "react";
import { Rectangle, Texture } from "pixi.js";

import { BITE, cellRect, SHEET_ROWS, type SheetAnimation, STRUGGLE } from "@components/descent-scene/spriteSheet";
import { type Sheet, SHEETS } from "@constants/fish";
import { cachedTextures } from "@utils/loadAssets";

export interface SheetFrames {
	swim: Texture[];
	bite: Texture[];
	struggle: Texture[];
}

/** Swim, bite and struggle frames per sheet, once every sheet has loaded. */
export function useFrames() {
	const [sheets] = useState(() => cachedTextures(SHEETS.map(s => s.url)));

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
