import { useEffect, useMemo, useState } from "react";
import { Assets, Rectangle, Texture } from "pixi.js";

import mackerelUrl from "@assets/creatures/mackeral.png";
import { depthToScreenY } from "@components/HarbourScene/framing";

import { cellRect, frameIndex, type SheetAnimation } from "./spriteSheet";

interface MackerelProps {
	view: { width: number; height: number };
	depth: number;
	seconds: number;
}

// Sheet layout + swim row from `src/assets/creatures/animations.json`.
const COLS = 8;
const ROWS = 4;
const SWIM: SheetAnimation = { row: 1, fps: 10, frameCount: 8 };

/** World depth the mackerel cruises at, in metres. */
const FISH_DEPTH_METERS = 300;
const FISH_SCALE = 0.7;
const SPEED_PX_PER_SECOND = 90;

/**
 * The first fish — a mackerel swimming right-to-left across the screen on
 * loop at a fixed world depth, so it scrolls past with the depth markers as
 * the hook descends. The art faces left, so no flip is needed. Only the swim
 * row is wired; idle / bite-hook / struggle wait on the catch mechanic.
 */
function Mackerel({ view, depth, seconds }: MackerelProps) {
	const [sheet, setSheet] = useState<Texture>();

	useEffect(() => {
		let live = true;
		// ponytail: loaded on scene mount, not via the boot manifest — same as
		// HarbourScene; route through §5's manifest when the creature set grows.
		Assets.load<Texture>(mackerelUrl).then(loaded => {
			if (live) setSheet(loaded);
		});
		return () => {
			live = false;
		};
	}, []);

	const frames = useMemo(() => {
		if (!sheet) return undefined;
		return Array.from({ length: SWIM.frameCount }, (_, col) => {
			const { x, y, width, height } = cellRect(sheet, COLS, ROWS, SWIM.row, col);
			return new Texture({ source: sheet.source, frame: new Rectangle(x, y, width, height) });
		});
	}, [sheet]);

	if (!frames) return null;

	const fishWidth = frames[0].width * FISH_SCALE;
	const travel = view.width + fishWidth;
	const x = view.width + fishWidth / 2 - ((seconds * SPEED_PX_PER_SECOND) % travel);
	const y = depthToScreenY(FISH_DEPTH_METERS, depth, view);

	return <pixiSprite texture={frames[frameIndex(seconds, SWIM)]} anchor={0.5} x={x} y={y} scale={FISH_SCALE} />;
}

export default Mackerel;
