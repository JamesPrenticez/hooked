import type { Texture } from "pixi.js";

import { HELI_ART, heliDrop, heliLayout, type HookPose } from "./extraction";

interface HelicopterProps {
	view: { width: number; height: number };
	/** `helicopter.png`; `undefined` until it loads. */
	texture?: Texture;
	/** Day / night multiply tint from `computeAmbience`. */
	tint: number;
	/** The hook, while a fish is being landed — the helicopter flies over it once called in. */
	hook?: HookPose;
	/** Wall-clock seconds — the hover's clock. */
	seconds: number;
}

/** The rotor disc, in art pixels: centred a little off the ring, as wide as the blades reach. */
const ROTOR = {
	x: 770 - HELI_ART.width * HELI_ART.ring.x,
	y: 290 - HELI_ART.height * HELI_ART.ring.y,
	rx: 740,
	ry: 135
};

/** Not on the job, it keeps a distant hover; on it, the hover steadies and it hangs the fish from its winch. */
const IDLE_BOB_PX = 5;
const WORKING_BOB_PX = 2;

/**
 * The helicopter (BUILD_PLAN §16), hovering small over the harbour skyline until a catch is too heavy for the
 * crane. Then it flies over the hook, growing as it comes closer, pays out its winch cable and lifts the last
 * of the fish clear. Faces right: the art faces left, so it is drawn mirrored. The blades are a still image, so
 * a soft flickering disc over them stands in for the spin.
 */
export function Helicopter({ view, texture, tint, hook, seconds }: HelicopterProps) {
	if (!texture) return null;

	const arrival = hook?.extraction?.arrival.helicopter ?? 0;
	const heli = heliLayout(view, hook ?? { x: view.width / 2, y: view.height / 2, grow: 1 }, arrival);
	const bob = Math.sin(seconds * 1.7) * (WORKING_BOB_PX + (IDLE_BOB_PX - WORKING_BOB_PX) * (1 - arrival));
	const y = heli.y + bob;
	const reach = heliDrop(arrival);

	return (
		<>
			{reach > 0 && hook && (
				<pixiGraphics
					draw={g => {
						g.clear();
						g.moveTo(heli.x, y)
							.lineTo(heli.x, y + (hook.y - y) * reach)
							.stroke({ width: 3, color: 0x2b2b2b });
					}}
				/>
			)}
			<pixiContainer
				x={heli.x}
				y={y}
				scale={{ x: -heli.scale, y: heli.scale }}
				rotation={Math.sin(seconds * 1.1) * 0.02}
			>
				<pixiSprite texture={texture} anchor={HELI_ART.ring} tint={tint} />
				<pixiGraphics
					tint={tint}
					alpha={0.2 + 0.08 * Math.sin(seconds * 47)}
					draw={g => {
						g.clear();
						g.ellipse(ROTOR.x, ROTOR.y, ROTOR.rx, ROTOR.ry).fill(0xcfe6f2);
					}}
				/>
			</pixiContainer>
		</>
	);
}
