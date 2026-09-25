import { useState } from "react";
import type { Graphics, Texture } from "pixi.js";

/** The part of a fish still under the surface reads as under it: paler and bluer. */
const SUBMERGED = { alpha: 0.7, tint: 0x9cc6e6 };

interface HookedFishProps {
	texture: Texture;
	/** Where the sprite's centre is, in the camera's space (the screen's, until the camera pulls out), and how it is turned and scaled. */
	x: number;
	y: number;
	rotation: number;
	scale: { x: number; y: number };
	blendMode: "screen" | "normal";
	/** The fish's mouth, on the hook, in the camera's space — what it hangs and sways from. */
	mouth: { x: number; y: number };
	/** How far the fish is swung out of true around its mouth, radians. */
	sway: number;
	view: { width: number; height: number };
	/** The water's surface, in the camera's space, while the fish is being landed: only the part above it is drawn in full, so
	 *  the fish comes out lips first. Unset, the fish is drawn whole. */
	seamY?: number;
}

/**
 * The fish on the hook, swaying gently from its mouth. While it is being landed it is drawn twice, clipped at the
 * water's surface — the part above in full, the part below faded into the water — so it can be lifted out of it a
 * bit at a time.
 */
export function HookedFish({ texture, x, y, rotation, scale, blendMode, mouth, sway, view, seamY }: HookedFishProps) {
	// A mask has to be a live Graphics in the scene, and only exists after the first commit — so the fish
	// waits a frame for it rather than flashing whole.
	const [above, setAbove] = useState<Graphics | null>(null);
	const [below, setBelow] = useState<Graphics | null>(null);

	const fish = (extra?: { alpha: number; tint: number }) => (
		<pixiContainer x={mouth.x} y={mouth.y} rotation={sway}>
			<pixiSprite
				texture={texture}
				anchor={0.5}
				blendMode={blendMode}
				x={x - mouth.x}
				y={y - mouth.y}
				rotation={rotation}
				scale={scale}
				{...extra}
			/>
		</pixiContainer>
	);

	if (seamY === undefined) return fish();

	return (
		<>
			<pixiContainer mask={above}>
				<pixiGraphics ref={setAbove} draw={g => g.clear().rect(0, 0, view.width, seamY).fill(0xffffff)} />
				{above && fish()}
			</pixiContainer>
			<pixiContainer mask={below}>
				<pixiGraphics ref={setBelow} draw={g => g.clear().rect(0, seamY, view.width, view.height).fill(0xffffff)} />
				{below && fish(SUBMERGED)}
			</pixiContainer>
		</>
	);
}
