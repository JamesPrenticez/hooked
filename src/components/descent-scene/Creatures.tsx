import type { Texture } from "pixi.js";

import { fishSway, type HookPose, MOUTH_DY } from "@components/harbour-scene/extraction";
import { cameraScroll, depthToScreenY } from "@components/harbour-scene/framing";
import { HOOKABLE_BY_ID } from "@constants/fish";
import { type SheetFrames, useFrames } from "@hooks/useFrames";
import { useHookStore } from "@stores/hookStore";
import { SIM_WIDTH, TICK_HZ } from "@utils/simConfig";
import { fishHeading, fishX, spawnWorld, swimPose } from "@utils/simWorld";

import { HookedFish } from "./HookedFish";
import { BITE, frameIndex, GASP, STRUGGLE } from "./spriteSheet";

interface CreaturesProps {
	view: { width: number; height: number };
	/** The camera's depth. */
	depth: number;
	seconds: number;
	/** Where the hook hangs and how the fish hangs from it (`hookPose`) — what places the hooked fish. */
	hook?: HookPose;
	/** Draw only the hooked fish — mounted above the fishing line so it overlaps the hook. Otherwise all but it. */
	onlyHooked?: boolean;
}

/** The creatures cruising the scripted descent: the sim's own roster, spawned once. */
const AUTO_WORLD = spawnWorld(1);

/** The frame a fish shows while it is on the hook: the bite once, then the struggle on loop — and once it is
 *  being landed, gasping. */
function hookedFrame({ bite, struggle }: SheetFrames, seconds: number, landing: boolean): Texture {
	if (landing) return bite[frameIndex(seconds, GASP)];
	const biteSeconds = BITE.frameCount / BITE.fps;
	return seconds < biteSeconds
		? bite[frameIndex(seconds, BITE)]
		: struggle[frameIndex(seconds - biteSeconds, STRUGGLE)];
}

/**
 * Every sea creature. On the scripted descent (`auto`) each cruises back and forth
 * across the screen on loop at its own world depth on the wall clock; with a sim
 * running (manual) they are the sim's world, placed by `fishX` at the sim's tick,
 * and the hooked one sits mouth-to-hook playing its bite then struggle rows — at the size it swims
 * until the landing shows its true one, and then coming up out of the water a bit at a time.
 */
export function Creatures({ view, depth, seconds, hook, onlyHooked = false }: CreaturesProps) {
	const frames = useFrames();
	const sim = useHookStore(state => state.sim);
	if (!frames || (onlyHooked && !sim)) return null;

	if (sim) {
		return sim.world.map((fish, i) => {
			if ((i === sim.hooked) !== onlyHooked) return null;
			const { art, scale } = HOOKABLE_BY_ID.get(fish.id)!;
			const set = frames.get(art)!;

			if (i === sim.hooked) {
				if (!hook) return null;
				// Hung head-up: rotated a quarter turn so the mouth points up, then the centre is offset so the
				// rotated mouth sits `MOUTH_DY` under the hook's line end. The mouth grows with the fish, so its
				// offset does too — the hook stays put in it.
				const { grow, girth = 1 } = hook;
				const direction = fishHeading(fish, sim.hookedTick);
				const scroll = cameraScroll(depth, view);
				const mouthY = hook.y - scroll + MOUTH_DY;
				return (
					<HookedFish
						key={i}
						texture={hookedFrame(set, (sim.tick - sim.hookedTick) / TICK_HZ, !!hook.extraction)}
						blendMode={art.opaque ? "screen" : "normal"}
						x={hook.x - direction * fish.mouth.dy * grow * girth}
						y={mouthY - fish.mouth.dx * grow}
						rotation={(-direction * Math.PI) / 2}
						scale={{
							x: scale * grow * -direction,
							y: scale * grow * girth
						}}
						mouth={{ x: hook.x, y: mouthY }}
						sway={fishSway(sim)}
						view={view}
						seamY={hook.extraction && hook.surfaceY !== undefined ? hook.surfaceY - scroll : undefined}
					/>
				);
			}

			const y = depthToScreenY(fish.meters, depth, view);
			if (Math.abs(y - view.height / 2) > view.height / 2 + fish.height) return null;

			return (
				<pixiSprite
					key={i}
					texture={set.swim[frameIndex(sim.tick / TICK_HZ + fish.phase, art.swim)]}
					anchor={0.5}
					blendMode={art.opaque ? "screen" : "normal"}
					x={(fishX(fish, sim.tick) / SIM_WIDTH) * view.width}
					y={y}
					scale={{ x: scale * -fishHeading(fish, sim.tick), y: scale }}
				/>
			);
		});
	}

	return AUTO_WORLD.map((creature, i) => {
		const { art, scale } = HOOKABLE_BY_ID.get(creature.id)!;
		const textures = frames.get(art)!.swim;
		const fishWidth = textures[0].width * scale;
		const y = depthToScreenY(creature.meters, depth, view);
		if (Math.abs(y - view.height / 2) > view.height / 2 + textures[0].height * scale) return null;

		const { x, direction } = swimPose(creature, fishWidth, view.width, seconds);

		return (
			<pixiSprite
				key={i}
				texture={textures[frameIndex(seconds + creature.phase, art.swim)]}
				anchor={0.5}
				blendMode={art.opaque ? "screen" : "normal"}
				x={x}
				y={y}
				scale={{ x: scale * -direction, y: scale }}
			/>
		);
	});
}
