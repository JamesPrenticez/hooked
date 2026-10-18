import { useState } from "react";

import { playerPose } from "@constants/playerAnimations";
import { useLayout } from "@stores/harbourDebugStore";
import { usePlayerStore } from "@stores/playerStore";

import { BOAT_ANCHOR, type BoatLayout } from "./framing";
import type { PlayerFrames } from "./playerFrames";

interface FishermanProps {
	/** The animation sheets, cut into frames (`buildPlayerFrames`). */
	frames: PlayerFrames;
	/** Where and how big to draw it — `boatLayout`, already bobbing. */
	boat: BoatLayout;
	/** Wall-clock seconds — the animation's clock. */
	seconds: number;
	view: { width: number; height: number };
	/** Scales him up about his rod tip, which stays where it is. 1 is his usual size. */
	grow?: number;
}

/**
 * The fisherman in his boat (BUILD_PLAN §7.2), centred in the middle third of
 * the screen with his hull on the waterline (`boatLayout`) — or, while a catch
 * is landed, pulled back beside the hook and then off to the sidelines — and
 * drawn above the ocean and the background strip. Plays whichever animation `usePlayerStore`
 * cues — idle until something says otherwise.
 */
export function Fisherman({ frames, boat, seconds, view, grow = 1 }: FishermanProps) {
	const cue = usePlayerStore(state => state.cue);
	const tweak = useLayout("player", view);

	// A new cue starts its clip from the top. Adjusted during render rather than
	// in an effect, so the first frame of the new clip isn't the old one.
	const [clip, setClip] = useState({ cue, startedAt: seconds });
	if (clip.cue !== cue) setClip({ cue, startedAt: seconds });

	const { sheet, frame } = playerPose(cue.animation, seconds - clip.startedAt);
	const { textures, stretchY } = frames[sheet];

	// Growing about the boat's anchor would carry the rod tip with it, so shift back by how far it moved.
	const tipX = boat.tip.x - (boat.x + tweak.x);
	const tipY = boat.tip.y - (boat.y + tweak.y);

	return (
		<pixiSprite
			texture={textures[frame]}
			anchor={BOAT_ANCHOR}
			x={boat.x + tweak.x - tipX * (grow - 1)}
			y={boat.y + tweak.y - tipY * stretchY * (grow - 1)}
			scale={{
				x: boat.scale * tweak.scale * grow,
				y: boat.scale * tweak.scale * grow * stretchY
			}}
		/>
	);
}
