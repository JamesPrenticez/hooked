import type { Texture } from "pixi.js";

import { CRANE_ART, craneDrop, craneLayout, craneRelease, type HookPose } from "./extraction";

interface DockCraneProps {
	view: { width: number; height: number };
	/** `dock-crane-static.png`; `undefined` until it loads. */
	texture?: Texture;
	/** Day / night multiply tint from `computeAmbience`. */
	tint: number;
	/** The hook, while a fish is being landed — the crane's cable pays out to it once the crane is called in. */
	hook?: HookPose;
}

/**
 * The dock crane (BUILD_PLAN §16), standing on the left-hand pier as part of the harbour — just chilling
 * until a catch is too heavy for the rod. Then its hoist cable pays out from the jib to the hook, hauls the
 * fish under the jib and lifts it, and lets go again if the helicopter has to take over.
 */
export function DockCrane({ view, texture, tint, hook }: DockCraneProps) {
	if (!texture) return null;

	const crane = craneLayout(view);
	const called = hook?.extraction?.arrival.crane ?? 0;
	const handedOver = hook?.extraction?.arrival.helicopter ?? 0;
	// How far down the cable reaches: to the hook once paid out, back up to the jib once released.
	const reach = craneDrop(called) * (1 - craneRelease(handedOver));
	const end = { x: crane.jib.x, y: crane.jib.y + ((hook?.y ?? crane.jib.y) - crane.jib.y) * reach };

	return (
		<>
			<pixiSprite texture={texture} anchor={CRANE_ART.foot} x={crane.x} y={crane.y} scale={crane.scale} tint={tint} />
			{reach > 0 && (
				<pixiGraphics
					draw={g => {
						g.clear();
						g.moveTo(crane.jib.x, crane.jib.y).lineTo(end.x, end.y).stroke({ width: 3, color: 0x2b2b2b });
						g.circle(end.x, end.y, 6).fill(0xf2b93a);
					}}
				/>
			)}
		</>
	);
}
