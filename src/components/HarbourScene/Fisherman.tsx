import type { Texture } from "pixi.js";

import { BOAT_ANCHOR, type BoatLayout } from "./framing";

interface FishermanProps {
	/** `player.png` — boat, fisherman and rod as one still. */
	texture?: Texture;
	/** Where and how big to draw it — `boatLayout`, already bobbing. */
	boat: BoatLayout;
	/** Day / night multiply tint from `computeAmbience`. */
	tint: number;
}

/**
 * The fisherman in his boat (BUILD_PLAN §7.2) — one placeholder still, centred
 * in the middle third of the screen with its hull on the waterline
 * (`boatLayout`). Drawn above the ocean and the background strip.
 */
function Fisherman({ texture, boat, tint }: FishermanProps) {
	if (!texture) return null;

	return <pixiSprite texture={texture} anchor={BOAT_ANCHOR} x={boat.x} y={boat.y} scale={boat.scale} tint={tint} />;
}

export default Fisherman;
