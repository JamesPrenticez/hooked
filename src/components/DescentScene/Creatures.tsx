import { useEffect, useMemo, useState } from "react";
import { Assets, Rectangle, Texture } from "pixi.js";

import { cameraScroll, depthToScreenY, hookWorldY } from "@components/HarbourScene/framing";
import { useHookStore } from "@stores/hookStore";
import { HOOK_TIP_DY, SIM_WIDTH, TICK_HZ } from "@utils/simConfig";
import { fishX } from "@utils/simWorld";

import { BITE, CREATURES, SHEET_ROWS, SPECIES, type Species, STRUGGLE } from "./creatureSpecies";
import { simHookX } from "./lineDrift";
import { cellRect, frameIndex, type SheetAnimation } from "./spriteSheet";

/** Px the hooked fish is lifted past the hook tip, so the hook sits inside its mouth. Tune by eye. */
const HOOK_IN_MOUTH = 30;

interface CreaturesProps {
	view: { width: number; height: number };
	depth: number;
	seconds: number;
	tip?: { x: number; y: number };
	/** Draw only the hooked fish — mounted above the fishing line so it overlaps the hook. Otherwise all but it. */
	onlyHooked?: boolean;
}

interface SpeciesFrames {
	swim: Texture[];
	bite: Texture[];
	struggle: Texture[];
}

/** Swim, bite and struggle frames per species, once every sheet has loaded. */
function useFrames() {
	const [sheets, setSheets] = useState<Record<string, Texture>>();

	useEffect(() => {
		let live = true;
		// ponytail: all 14 sheets load on scene mount (~85MB of textures), not via
		// the boot manifest — same as HarbourScene; load per depth zone or route
		// through §5's manifest if memory matters.
		Assets.load<Texture>(SPECIES.map(s => s.url)).then(loaded => {
			if (live) setSheets(loaded);
		});
		return () => {
			live = false;
		};
	}, []);

	return useMemo(() => {
		if (!sheets) return undefined;
		const row = (s: Species, { row, frameCount }: SheetAnimation) =>
			Array.from({ length: frameCount }, (_, col) => {
				const { x, y, width, height } = cellRect(sheets[s.url], s.cols, SHEET_ROWS, row, col);
				return new Texture({ source: sheets[s.url].source, frame: new Rectangle(x, y, width, height) });
			});
		return new Map<Species, SpeciesFrames>(
			SPECIES.map(s => [s, { swim: row(s, s.swim), bite: row(s, BITE), struggle: row(s, STRUGGLE) }])
		);
	}, [sheets]);
}

/** The frame a fish shows while it is on the hook: the bite once, then the struggle on loop. */
function hookedFrame({ bite, struggle }: SpeciesFrames, seconds: number): Texture {
	const biteSeconds = BITE.frameCount / BITE.fps;
	return seconds < biteSeconds
		? bite[frameIndex(seconds, BITE)]
		: struggle[frameIndex(seconds - biteSeconds, STRUGGLE)];
}

/**
 * Every sea creature. On the scripted descent (`auto`) each cruises back and forth
 * across the screen on loop at its own world depth on the wall clock; with a sim
 * running (manual) they are the sim's world, placed by `fishX` at the sim's tick,
 * and the hooked one sits mouth-to-hook playing its bite then struggle rows.
 */
function Creatures({ view, depth, seconds, tip, onlyHooked = false }: CreaturesProps) {
	const frames = useFrames();
	const sim = useHookStore(state => state.sim);
	if (!frames || (onlyHooked && !sim)) return null;

	if (sim) {
		const bySpecies = new Map(SPECIES.map(s => [s.id, s]));
		return sim.world.map((fish, i) => {
			if ((i === sim.hooked) !== onlyHooked) return null;
			const species = bySpecies.get(fish.art)!;
			const set = frames.get(species)!;
			const hooked = i === sim.hooked;
			const clock = sim.tick / TICK_HZ;
			let x = (fishX(fish, sim.tick) / SIM_WIDTH) * view.width;
			let y = depthToScreenY(fish.meters, depth, view);
			if (hooked) {
				// Hung head-up: rotated a quarter turn so the mouth points up, then the centre is
				// offset so the rotated mouth sits on the hook tip (which follows the hook's x).
				// The hook rides the same path as `FishingLine`'s: eased from the rod tip over the cast.
				const hookX = simHookX(tip?.x ?? view.width / 2, sim.x, sim.depthM, view.width);
				const hookY = hookWorldY(sim.depthM, tip?.y ?? view.height / 2, view) - cameraScroll(sim.depthM, view);
				x = hookX - fish.direction * fish.mouth.dy;
				y = hookY + HOOK_TIP_DY - HOOK_IN_MOUTH - fish.mouth.dx;
			} else if (Math.abs(y - view.height / 2) > view.height / 2 + fish.height) return null;

			return (
				<pixiSprite
					key={i}
					texture={
						hooked
							? hookedFrame(set, (sim.tick - sim.hookedTick) / TICK_HZ)
							: set.swim[frameIndex(clock + fish.phase, species.swim)]
					}
					anchor={0.5}
					blendMode={species.opaque ? "screen" : "normal"}
					x={x}
					y={y}
					rotation={hooked ? (-fish.direction * Math.PI) / 2 : 0}
					scale={{ x: species.scale * -fish.direction, y: species.scale }}
				/>
			);
		});
	}

	return CREATURES.map((creature, i) => {
		const { species, direction } = creature;
		const textures = frames.get(species)!.swim;
		const fishWidth = textures[0].width * species.scale;
		const y = depthToScreenY(creature.meters, depth, view);
		if (Math.abs(y - view.height / 2) > view.height / 2 + textures[0].height * species.scale) return null;

		const travel = view.width + fishWidth;
		const progress = (seconds * creature.speed + creature.offset) % travel;
		const x = direction === -1 ? view.width + fishWidth / 2 - progress : progress - fishWidth / 2;

		return (
			<pixiSprite
				key={i}
				texture={textures[frameIndex(seconds + creature.phase, species.swim)]}
				anchor={0.5}
				blendMode={species.opaque ? "screen" : "normal"}
				x={x}
				y={y}
				scale={{ x: species.scale * -direction, y: species.scale }}
			/>
		);
	});
}

export default Creatures;
