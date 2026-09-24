import { useEffect, useMemo, useState } from "react";
import { Assets, Rectangle, Texture } from "pixi.js";

import { KRAKEN_ANIMATIONS, KRAKEN_FIGHT, KRAKEN_SHEETS, krakenFrame } from "@constants/krakenAnimations";
import { useDebugStore } from "@stores/debugStore";
import { useKrakenStore } from "@stores/krakenStore";

import { krakenAnchorY, krakenFightPose, krakenFitScale } from "./krakenFight";
import { krakenFrameRect } from "./krakenFrames";
import { SHEET_URLS } from "./krakenSheets";

interface KrakenProps {
	view: { width: number; height: number };
	/** Wall-clock seconds — the animation's clock. */
	seconds: number;
}

/**
 * The jackpot Kraken at the bottom of the trench (docs/JACKPOT.md), hanging under the
 * jackpot line. It plays the grab-and-yank fight (`KRAKEN_FIGHT`) from the moment it
 * mounts, bigger than the fitted size and holding the hook in its coil
 * (`krakenFightPose`; `FishingLine` draws the hook there) — unless the debug panel
 * forced the trench, where it plays whichever sheet animation `useKrakenStore` cues,
 * fitted to the screen and centred across it. Other sheets load when first cued, not
 * up front — they're ~3MB each.
 */
function Kraken({ view, seconds }: KrakenProps) {
	const forced = useKrakenStore(state => state.forceTrench);
	const cue = useKrakenStore(state => state.cue);
	const setFightStart = useKrakenStore(state => state.setFightStart);
	const depthZones = useDebugStore(state => state.depthZones);
	const animation = KRAKEN_ANIMATIONS[forced ? cue.animation : KRAKEN_FIGHT[0]];
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

	// `FishingLine` runs the hook off the same start, so it stays in the coil.
	const fighting = ready && !forced;
	useEffect(() => {
		if (!fighting) return;
		setFightStart(clip.startedAt);
		return () => setFightStart(undefined);
	}, [fighting, clip.startedAt, setFightStart]);

	if (!frames) return null;

	const elapsed = seconds - clip.startedAt;
	if (forced) {
		const texture = frames[krakenFrame(animation.id, elapsed)];
		const scale = krakenFitScale(view, texture);
		const y = krakenAnchorY(view, depthZones) + (texture.height * scale) / 2;
		return <pixiSprite texture={texture} anchor={0.5} x={view.width / 2} y={y} scale={scale} />;
	}

	const pose = krakenFightPose(view, elapsed, depthZones);
	return (
		<pixiSprite texture={frames[pose.frame]} anchor={0.5} x={pose.sprite.x} y={pose.sprite.y} scale={pose.scale} />
	);
}

export default Kraken;
