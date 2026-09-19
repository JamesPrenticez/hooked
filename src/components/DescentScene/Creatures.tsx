import { useEffect, useMemo, useState } from "react";
import { Assets, Rectangle, Texture } from "pixi.js";

import { depthToScreenY } from "@components/HarbourScene/framing";

import { CREATURES, SHEET_ROWS, SPECIES, type Species } from "./creatureSpecies";
import { cellRect, frameIndex } from "./spriteSheet";

interface CreaturesProps {
	view: { width: number; height: number };
	depth: number;
	seconds: number;
}

/** Swim-row frames per sheet url, once every sheet has loaded. */
function useSwimFrames() {
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
		return new Map<Species, Texture[]>(
			SPECIES.map(s => [
				s,
				Array.from({ length: s.swim.frameCount }, (_, col) => {
					const { x, y, width, height } = cellRect(sheets[s.url], s.cols, SHEET_ROWS, s.swim.row, col);
					return new Texture({ source: sheets[s.url].source, frame: new Rectangle(x, y, width, height) });
				})
			])
		);
	}, [sheets]);
}

/**
 * Every sea creature, each cruising back and forth across the screen on loop at
 * its own world depth, so they scroll past with the depth markers as the hook
 * descends. Only the swim row is wired; idle / bite-hook / struggle wait on the
 * catch mechanic.
 */
function Creatures({ view, depth, seconds }: CreaturesProps) {
	const frames = useSwimFrames();
	if (!frames) return null;

	return CREATURES.map((creature, i) => {
		const { species, direction } = creature;
		const textures = frames.get(species)!;
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
