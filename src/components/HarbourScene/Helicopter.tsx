import type { Texture } from "pixi.js";

import { useLayout } from "@stores/harbourDebugStore";

import { HELI_ART, heliDrop, heliLayout, type HookPose, release } from "./extraction";

interface HelicopterProps {
	view: { width: number; height: number };
	/** `helicopter.png`; `undefined` until it loads. */
	texture?: Texture;
	/** Day / night multiply tint from `computeAmbience`. */
	tint: number;
	/** The hook, while a fish is being landed — the helicopter flies in over it and winches the fish up. */
	hook?: HookPose;
	/** The Chinook: the same helicopter, bigger, that takes the fish from the helicopter. */
	heavy?: boolean;
}

/** The helicopter, parked still on the skyline's helipad until a catch calls it in. Faces left, as the art is drawn. */
export function Helicopter({ view, texture, tint, hook, heavy = false }: HelicopterProps) {
	const tweak = useLayout("helicopter", view);
	if (!texture) return null;

	const arrival = hook?.extraction?.arrival;
	const called = (heavy ? arrival?.chinook : arrival?.helicopter) ?? 0;
	// The Chinook only exists once it is called; the helicopter lets go once the Chinook comes in for the fish.
	if (heavy && called === 0) return null;
	const done = heavy ? 0 : release(arrival?.chinook ?? 0);

	const pose = hook ?? { x: view.width / 2, y: view.height / 2, grow: 1 };
	const heli = heliLayout(view, pose, called, { heavy, release: done });
	// Its cable pays out from the belly to the hook, and reels back in as it lets go.
	const reach = heliDrop(called) * (1 - done);
	const ring = { x: heli.x + tweak.x, y: heli.y + tweak.y };
	const end = {
		x: ring.x + (pose.x - ring.x) * reach,
		y: ring.y + (pose.y - ring.y) * reach
	};

	return (
		<>
			<pixiContainer x={ring.x} y={ring.y} scale={heli.scale * tweak.scale}>
				<pixiSprite texture={texture} anchor={HELI_ART.ring} tint={tint} />
			</pixiContainer>
			{reach > 0 && (
				<pixiGraphics
					draw={g => {
						g.clear();
						g.moveTo(ring.x, ring.y).lineTo(end.x, end.y).stroke({ width: 3, color: 0x2b2b2b });
						g.circle(end.x, end.y, 6).fill(0xf2b93a);
					}}
				/>
			)}
		</>
	);
}
