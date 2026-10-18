import { frameIndex } from "@components/descent-scene/spriteSheet";
import { HOOKABLE_BY_ID } from "@constants/fish";
import { useAnimatedNumber } from "@hooks/useAnimatedNumber";
import { useFrames } from "@hooks/useFrames";
import { swimPose } from "@utils/simWorld";

import { waterlineY } from "./framing";

interface IdleFishProps {
	view: { width: number; height: number };
	seconds: number;
	/** The cast is under way: the fish scatter off the sides. */
	scatter: boolean;
}

/** Fish idling under the waterline: `y` is a share of the water below the boat. The whole set is drawn at `SCALE`
 *  of its in-world size so the shark doesn't swallow the screen. */
const SCALE = 0.5;
const IDLE_FISH = [
	{ id: "barracuda", y: 0.15, speed: 60, offset: 0, direction: -1 },
	{ id: "snapper", y: 0.33, speed: 40, offset: 300, direction: 1 },
	{ id: "bluefin-tuna", y: 0.5, speed: 70, offset: 700, direction: -1 },
	{ id: "shark", y: 0.7, speed: 35, offset: 150, direction: 1 },
	{ id: "lanternfish", y: 0.88, speed: 30, offset: 500, direction: -1 }
] as const;

/** The idle harbour's fish. Mounted in the scrolling world, so the cast carries them up and away with it. */
export function IdleFish({ view, seconds, scatter }: IdleFishProps) {
	const frames = useFrames();
	// Eases out on the cast, but snaps back (no slide in from the sides) once the round is over.
	const eased = useAnimatedNumber(scatter ? 1 : 0);
	const away = scatter ? eased : 0;
	if (!frames) return null;

	const top = waterlineY(view);
	return IDLE_FISH.map(idle => {
		const { art, scale: baseScale } = HOOKABLE_BY_ID.get(idle.id)!;
		const swim = frames.get(art)!.swim;
		const scale = baseScale * SCALE;
		const width = swim[0].width * scale;
		const pose = swimPose(idle, width, view.width, seconds);
		// Scattering fish bolt for the nearer side, facing it.
		const exit = pose.x < view.width / 2 ? -1 : 1;
		const heading = away > 0 ? exit : pose.direction;
		const offScreen = exit < 0 ? -width : view.width + width;
		return (
			<pixiSprite
				key={idle.id}
				texture={swim[frameIndex(seconds * (1 + 2 * away), art.swim)]}
				anchor={0.5}
				blendMode={art.opaque ? "screen" : "normal"}
				x={pose.x + (offScreen - pose.x) * away}
				y={top + (view.height - top) * idle.y}
				scale={{ x: -scale * heading, y: scale }}
			/>
		);
	});
}
