import type { Texture } from "pixi.js";

import { HELI_ART, heliLayout } from "./extraction";

interface HelicopterProps {
	view: { width: number; height: number };
	/** `helicopter.png`; `undefined` until it loads. */
	texture?: Texture;
	/** Day / night multiply tint from `computeAmbience`. */
	tint: number;
}

/** The helicopter, parked still on the skyline's helipad. Faces left, as the art is drawn. */
export function Helicopter({ view, texture, tint }: HelicopterProps) {
	if (!texture) return null;

	const heli = heliLayout(view, { x: view.width / 2, y: view.height / 2, grow: 1 }, 0);

	return (
		<pixiContainer x={heli.x} y={heli.y} scale={heli.scale}>
			<pixiSprite texture={texture} anchor={HELI_ART.ring} tint={tint} />
		</pixiContainer>
	);
}
