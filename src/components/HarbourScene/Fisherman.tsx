import { useState } from "react";

import { playerPose } from "@constants/playerAnimations";
import { usePlayerStore } from "@stores/playerStore";

import { BOAT_ANCHOR, type BoatLayout } from "./framing";
import type { PlayerFrames } from "./playerFrames";

interface FishermanProps {
	/** The animation sheets, cut into frames (`buildPlayerFrames`). */
	frames: PlayerFrames;
	/** Where and how big to draw it — `boatLayout`, already bobbing. */
	boat: BoatLayout;
	/** Day / night multiply tint from `computeAmbience`. */
	tint: number;
	/** Wall-clock seconds — the animation's clock. */
	seconds: number;
}

/**
 * The fisherman in his boat (BUILD_PLAN §7.2), centred in the middle third of
 * the screen with his hull on the waterline (`boatLayout`) and drawn above the
 * ocean and the background strip. Plays whichever animation `usePlayerStore`
 * cues — idle until something says otherwise.
 */
export function Fisherman({ frames, boat, tint, seconds }: FishermanProps) {
	const cue = usePlayerStore(state => state.cue);

	// A new cue starts its clip from the top. Adjusted during render rather than
	// in an effect, so the first frame of the new clip isn't the old one.
	const [clip, setClip] = useState({ cue, startedAt: seconds });
	if (clip.cue !== cue) setClip({ cue, startedAt: seconds });

	const { sheet, frame } = playerPose(cue.animation, seconds - clip.startedAt);
	const { textures, stretchY } = frames[sheet];

	return (
		<pixiSprite
			texture={textures[frame]}
			anchor={BOAT_ANCHOR}
			x={boat.x}
			y={boat.y}
			scale={{ x: boat.scale, y: boat.scale * stretchY }}
			tint={tint}
		/>
	);
}
