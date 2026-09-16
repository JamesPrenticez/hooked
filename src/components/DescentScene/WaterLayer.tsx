import type { Texture } from "pixi.js";

interface WaterLayerProps {
	view: { width: number; height: number };
	/** The full-descent water column art, split top/bottom — a single
	 *  2560×9600 texture exceeds the ~8192px WebGL max texture size on many
	 *  GPUs, so the source is pre-cropped into two 2560×4800 tiles that stack
	 *  back into one continuous image. World depth 0..9600 is 1 unit per
	 *  metre of `depth` (UNDERWATER_SCENE_ARCHITECTURE.md). `undefined` until
	 *  the load resolves. */
	textureTop?: Texture;
	textureBottom?: Texture;
	/** Metres below the boat — scrolls the visible slice of the column. */
	depth: number;
	/** `0`..`1` dark overlay strength — light falloff with depth. */
	darkness: number;
}

/**
 * The underwater backdrop: the continuous water-column art scrolled to the
 * current depth and scaled to cover the viewport width, plus a flat dark
 * overlay that thickens with depth. Past the art's authored depth the scroll
 * clamps at the bottom of the image, which is already flat `#05080c`, so the
 * descent continues without a visible seam.
 */
function WaterLayer({ view, textureTop, textureBottom, depth, darkness }: WaterLayerProps) {
	if (!textureTop || !textureBottom) return null;

	const scale = view.width / textureTop.width;
	const columnHeight = (textureTop.height + textureBottom.height) * scale;
	const maxOffset = Math.max(0, columnHeight - view.height);
	const offset = Math.min(depth * scale, maxOffset);

	return (
		<pixiContainer>
			<pixiSprite texture={textureTop} x={0} y={-offset} scale={scale} />
			<pixiSprite texture={textureBottom} x={0} y={-offset + textureTop.height * scale} scale={scale} />
			<pixiGraphics
				draw={g => g.clear().rect(0, 0, view.width, view.height).fill({ color: 0x000000, alpha: darkness })}
			/>
		</pixiContainer>
	);
}

export default WaterLayer;
