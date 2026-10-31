import { fishSway, type HookPose, MOUTH_DY } from "@components/harbour-scene/extraction";
import { cameraScroll } from "@components/harbour-scene/framing";
import { KRAKEN_ANIMATIONS, KRAKEN_HANG, krakenFrame } from "@constants/krakenAnimations";
import { useHookStore } from "@stores/hookStore";
import { TICK_HZ } from "@utils/simConfig";

import { HookedFish } from "./HookedFish";
import { SWIM_BOX } from "./krakenFight";
import { SWIM_MOUTH } from "./krakenFrames";
import { useKrakenFrames } from "./useKrakenFrames";

interface HookedKrakenProps {
	view: { width: number; height: number };
	/** The camera's depth. */
	depth: number;
	/** Where the hook hangs and how the catch hangs from it (`hookPose`). */
	hook?: HookPose;
}

/**
 * The Kraken being landed: it hangs head-up from the hook by its beak, like any fish (`Creatures`), at the size
 * the landing grows it to. Mounted above the fishing line so it overlaps the hook. Only while it is being landed —
 * before that the trench's `Kraken` has it.
 */
export function HookedKraken({ view, depth, hook }: HookedKrakenProps) {
	const sim = useHookStore(state => state.sim);
	const frames = useKrakenFrames(KRAKEN_ANIMATIONS[KRAKEN_HANG].sheet);
	if (!frames || !hook || sim?.phase !== "extract" || sim.hooked >= 0) return null;

	const { grow, girth = 1 } = hook;
	const scroll = cameraScroll(depth, view);
	const mouth = { x: hook.x, y: hook.y - scroll + MOUTH_DY };
	// The art faces right, so a quarter turn anticlockwise points the beak up. The beak is `SWIM_MOUTH` from the
	// sprite's middle, which that turn takes from (x, y) to (y, -x): put the middle there, under the hook.
	return (
		<HookedFish
			texture={frames[krakenFrame(KRAKEN_HANG, sim.tick / TICK_HZ)]}
			blendMode="normal"
			x={mouth.x - SWIM_MOUTH.y * SWIM_BOX.height * grow * girth}
			y={mouth.y + SWIM_MOUTH.x * SWIM_BOX.width * grow}
			rotation={-Math.PI / 2}
			scale={{ x: grow, y: grow * girth }}
			mouth={mouth}
			sway={fishSway(sim)}
			view={view}
			seamY={hook.extraction && hook.surfaceY !== undefined ? hook.surfaceY - scroll : undefined}
		/>
	);
}
