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
}

/**
 * The fisherman in his boat (BUILD_PLAN §7.2), centred in the middle third of
 * the screen with his hull on the waterline (`boatLayout`) — or, while a catch
 * is landed, pulled back beside the hook and then off to the sidelines — and
 * drawn above the ocean and the background strip. Plays whichever animation `usePlayerStore`
 * cues — idle until something says otherwise.
 */
export function Fisherman({ frames, boat, seconds, view }: FishermanProps) {
	const cue = usePlayerStore(state => state.cue);
	const tweak = useLayout("player", view);

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
			x={boat.x + tweak.x}
			y={boat.y + tweak.y}
			scale={{
				x: boat.scale * tweak.scale,
				y: boat.scale * tweak.scale * stretchY
			}}
		/>
	);
}
