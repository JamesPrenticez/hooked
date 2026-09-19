import { useEffect, useMemo, useState } from "react";
import { Assets, Rectangle, Texture } from "pixi.js";

import krak1 from "@assets/kraken/krak-1.png";
import krak2 from "@assets/kraken/krak-2.png";
import krak3 from "@assets/kraken/krak-3.png";
import krak4 from "@assets/kraken/krak-4.png";
import krak5 from "@assets/kraken/krak-5.png";
import krak6 from "@assets/kraken/krak-6.png";
import krak7 from "@assets/kraken/krak-7.png";
import { KRAKEN_ANIMATIONS, KRAKEN_SHEETS, krakenFrame } from "@constants/krakenAnimations";
import { useKrakenStore } from "@stores/krakenStore";

import { krakenFrameRect } from "./krakenFrames";

/** Sheet id → image, in the order `kraken-animations.json` lists them. */
const SHEET_URLS: Record<string, string> = Object.fromEntries(
	[krak1, krak2, krak3, krak4, krak5, krak6, krak7].map((url, i) => [KRAKEN_SHEETS[i].id, url])
);

/** Share of the screen a frame may fill. */
const MAX_WIDTH = 0.9;
const MAX_HEIGHT = 0.5;

interface KrakenProps {
	view: { width: number; height: number };
	/** Wall-clock seconds — the animation's clock. */
	seconds: number;
}

/**
 * The jackpot Kraken at the bottom of the trench (docs/JACKPOT.md), playing
 * whichever sheet animation `useKrakenStore` cues, centred on screen. Sheets
 * load when first cued, not up front — they're ~3MB each and only the debug
 * panel picks between them so far.
 */
function Kraken({ view, seconds }: KrakenProps) {
	const cue = useKrakenStore(state => state.cue);
	const animation = KRAKEN_ANIMATIONS[cue.animation];
	const sheet = KRAKEN_SHEETS.find(({ id }) => id === animation.sheet)!;

	const [loaded, setLoaded] = useState<{ id: string; texture: Texture }>();
	useEffect(() => {
		let live = true;
		Assets.load<Texture>(SHEET_URLS[sheet.id]).then(texture => {
			if (live) setLoaded({ id: sheet.id, texture });
		});
		return () => {
			live = false;
		};
	}, [sheet.id]);

	const frames = useMemo(() => {
		if (loaded?.id !== sheet.id) return undefined;
		return Array.from({ length: sheet.columns * sheet.rows }, (_, frame) => {
			const r = krakenFrameRect(sheet.id, sheet.columns, sheet.rows, frame);
			return new Texture({
				source: loaded.texture.source,
				frame: new Rectangle(r.x, r.y, r.width, r.height),
				orig: new Rectangle(0, 0, r.boxWidth, r.boxHeight),
				trim: new Rectangle(r.trimX, r.trimY, r.width, r.height)
			});
		});
	}, [loaded, sheet]);

	// A new cue starts its clip from the top (same as `Fisherman`) — and so does
	// its sheet finishing loading, so the first frames aren't spent unseen.
	const ready = !!frames;
	const [clip, setClip] = useState({ cue, ready, startedAt: seconds });
	if (clip.cue !== cue || clip.ready !== ready) setClip({ cue, ready, startedAt: seconds });

	if (!frames) return null;

	const texture = frames[krakenFrame(animation.id, seconds - clip.startedAt)];
	const scale = Math.min((view.width * MAX_WIDTH) / texture.width, (view.height * MAX_HEIGHT) / texture.height);

	return <pixiSprite texture={texture} anchor={0.5} x={view.width / 2} y={view.height / 2} scale={scale} />;
}

export default Kraken;
