import type { Texture } from "pixi.js";

import { BOOM_ART, CRANE_ART, craneDrop, craneLayout, type HookPose } from "./extraction";

interface DockCraneProps {
	view: { width: number; height: number };
	/** The crane's three pieces (`tower.png`, `boom-segment.png`, `boom-tip.png`); `undefined` until they load. */
	textures?: { tower?: Texture; segment?: Texture; tip?: Texture };
	/** Day / night multiply tint from `computeAmbience`. */
	tint: number;
	/** How far the crane has come out from its pier onto the job (`landingScene`), 0..1. */
	out: number;
	/** The hook, while a fish is being landed — the crane's cable pays out to it once the crane is called in. */
	hook?: HookPose;
}

/**
 * The dock crane (BUILD_PLAN §16), standing on the right-hand pier as part of the harbour — just chilling
 * until a catch is too heavy for the rod. Then it stays put on its pier, growing while its boom runs out until the
 * tip is over the hook at the middle of the screen; its hoist cable pays out from the tip to the hook and lifts the fish.
 */
export function DockCrane({ view, textures, tint, out, hook }: DockCraneProps) {
	if (!textures?.tower || !textures.segment || !textures.tip) return null;

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
			{/* The art faces right; mirrored, the boom runs out to the left. It slides out from behind the tower's sleeve. */}
			<pixiContainer
				x={crane.x}
				y={crane.y}
				pivot={{ x: CRANE_ART.foot.x * CRANE_ART.width, y: CRANE_ART.foot.y * CRANE_ART.height }}
				scale={{ x: -crane.scale, y: crane.scale }}
			>
				{crane.boom > 0 && (
					<pixiTilingSprite
						texture={textures.segment}
						x={CRANE_ART.mount.x}
						y={BOOM_ART.segment.y}
						width={crane.boom}
						height={BOOM_ART.segment.height * BOOM_ART.segment.scale}
						tileScale={{ x: BOOM_ART.segment.scale, y: BOOM_ART.segment.scale }}
						tint={tint}
					/>
				)}
				<pixiSprite
					texture={textures.tip}
					x={CRANE_ART.mount.x + crane.boom - BOOM_ART.tip.overlap}
					y={BOOM_ART.tip.y}
					scale={{ x: BOOM_ART.tip.scale, y: BOOM_ART.tip.scale }}
					tint={tint}
				/>
				<pixiSprite texture={textures.tower} tint={tint} />
			</pixiContainer>
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
