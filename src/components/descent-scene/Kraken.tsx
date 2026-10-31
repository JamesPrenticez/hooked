import { useEffect, useState } from "react";

import { MOUTH_DY } from "@components/harbour-scene/extraction";
import {
	KRAKEN_ANIMATIONS,
	KRAKEN_FIGHT,
	KRAKEN_FIGHT_SECONDS,
	KRAKEN_SHEETS,
	KRAKEN_SWIM,
	KRAKEN_SWIM_SECONDS,
	krakenFrame
} from "@constants/krakenAnimations";
import { useDebugStore } from "@stores/debugStore";
import { useHookStore } from "@stores/hookStore";
import { useKrakenStore } from "@stores/krakenStore";
import { SIM_WIDTH } from "@utils/simConfig";

import {
	hookedMouth,
	krakenAnchorY,
	krakenFightPose,
	krakenFitScale,
	krakenHungPose,
	krakenSwimPose
} from "./krakenFight";
import { useKrakenFrames } from "./useKrakenFrames";

interface KrakenProps {
	view: { width: number; height: number };
	/** Wall-clock seconds — the animation's clock. */
	seconds: number;
	/** How far the camera has risen off the Kraken, px: once it is hooked, the trench scrolls down past it as the camera leaves. */
	rise?: number;
}

/**
 * The jackpot Kraken at the bottom of the trench (docs/JACKPOT.md), hanging under the
 * jackpot line. It plays the grab-and-yank fight (`KRAKEN_FIGHT`) from the moment it
 * mounts, bigger than the fitted size and holding the hook in its coil
 * (`krakenFightPose`; `FishingLine` draws the hook there), then swims back and forth across
 * the screen with the hook in its beak (`krakenSwimPose`), then hangs from the hook struggling (`krakenHungPose`) — unless the debug panel
 * forced the trench, where it plays whichever sheet animation `useKrakenStore` cues,
 * fitted to the screen and centred across it. Other sheets load when first cued, not
 * up front — they're ~3MB each.
 */
export function Kraken({ view, seconds, rise = 0 }: KrakenProps) {
	const forced = useKrakenStore(state => state.forceTrench);
	const cue = useKrakenStore(state => state.cue);
	const setFightStart = useKrakenStore(state => state.setFightStart);
	const depthZones = useDebugStore(state => state.depthZones);
	const animation = KRAKEN_ANIMATIONS[forced ? cue.animation : KRAKEN_FIGHT[0]];
	const hookX = useHookStore(state => state.sim?.x ?? SIM_WIDTH / 2);
	const frames = useKrakenFrames(animation.sheet);
	const swimFrames = useKrakenFrames(KRAKEN_ANIMATIONS[KRAKEN_SWIM].sheet);

	// A new cue starts its clip from the top (same as `Fisherman`) — and so does
	// its sheets finishing loading, so the first frames aren't spent unseen.
	const ready = !!frames && (forced || !!swimFrames);
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

	const swum = elapsed - KRAKEN_FIGHT_SECONDS;
	if (swum >= KRAKEN_SWIM_SECONDS && swimFrames) {
		const hung = krakenHungPose(view, swum - KRAKEN_SWIM_SECONDS, hookedMouth(view, hookX, MOUTH_DY), depthZones);
		return (
			<pixiContainer x={hung.beak.x} y={hung.beak.y + rise} rotation={hung.sway}>
				<pixiSprite
					texture={swimFrames[hung.frame]}
					anchor={0.5}
					x={hung.sprite.x - hung.beak.x}
					y={hung.sprite.y - hung.beak.y}
					rotation={hung.rotation}
					scale={hung.scale}
				/>
			</pixiContainer>
		);
	}
	if (swum >= 0 && swimFrames) {
		const swim = krakenSwimPose(view, swum, depthZones);
		return (
			<pixiSprite
				texture={swimFrames[swim.frame]}
				anchor={0.5}
				x={swim.sprite.x}
				y={swim.sprite.y}
				scale={{ x: swim.scale * swim.facing, y: swim.scale }}
			/>
		);
	}

	const pose = krakenFightPose(view, elapsed, depthZones);
	return (
		<pixiSprite texture={frames[pose.frame]} anchor={0.5} x={pose.sprite.x} y={pose.sprite.y} scale={pose.scale} />
	);
}
