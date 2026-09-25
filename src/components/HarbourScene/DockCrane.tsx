import type { Texture } from "pixi.js";

import { CRANE_ART, craneDrop, craneLayout, type HookPose } from "./extraction";

interface DockCraneProps {
	view: { width: number; height: number };
	/** `dock-crane-static.png`; `undefined` until it loads. */
	texture?: Texture;
	/** Day / night multiply tint from `computeAmbience`. */
	tint: number;
	/** How far the crane has come out from its pier onto the job (`landingScene`), 0..1. */
	out: number;
	/** The hook, while a fish is being landed — the crane's cable pays out to it once the crane is called in. */
	hook?: HookPose;
}

/**
 * The dock crane (BUILD_PLAN §16), standing on the right-hand pier as part of the harbour — just chilling
 * until a catch is too heavy for the rod. Then it comes out, growing until its jib reaches over the hook at the
 * middle of the screen; its hoist cable pays out from the jib to the hook and lifts the fish.
 */
export function DockCrane({ view, texture, tint, out, hook }: DockCraneProps) {
	if (!texture) return null;

	const crane = craneLayout(view, out);
	// The cable and its ball are drawn for the crane on its pier, so they grow with it.
	const grown = crane.scale / craneLayout(view).scale;
	const called = hook?.extraction?.arrival.crane ?? 0;
	// How far down the cable reaches: to the hook once paid out. It doesn't let go when the helicopter is called in
	// (`craneRelease`) until the helicopter really flies in to take the fish — or the fish would hang in the air.
	const reach = craneDrop(called);
	const end = {
		x: crane.jib.x + ((hook?.x ?? crane.jib.x) - crane.jib.x) * reach,
		y: crane.jib.y + ((hook?.y ?? crane.jib.y) - crane.jib.y) * reach
	};

	return (
		<>
			<pixiSprite
				texture={texture}
				anchor={CRANE_ART.foot}
				x={crane.x}
				y={crane.y}
				scale={{ x: -crane.scale, y: crane.scale }}
				tint={tint}
			/>
			{reach > 0 && (
				<pixiGraphics
					draw={g => {
						g.clear();
						g.moveTo(crane.jib.x, crane.jib.y)
							.lineTo(end.x, end.y)
							.stroke({ width: 3 * grown, color: 0x2b2b2b });
						g.circle(end.x, end.y, 6 * grown).fill(0xf2b93a);
					}}
				/>
			)}
		</>
	);
}
