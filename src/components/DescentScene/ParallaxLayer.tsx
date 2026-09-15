import { parallaxParticles } from "./particles";

interface ParallaxLayerProps {
	view: { width: number; height: number };
	depth: number;
	count: number;
	speed: number;
	seed: number;
	alpha: number;
	color: number;
}

/** One drifting-particle band (`particles.ts` computes the layout) —
 *  several of these at different `speed`/`alpha` values is the parallax. */
function ParallaxLayer({ view, depth, count, speed, seed, alpha, color }: ParallaxLayerProps) {
	return (
		<pixiGraphics
			draw={g => {
				g.clear();
				for (const p of parallaxParticles(count, depth, speed, seed)) {
					g.circle(p.x * view.width, p.y * view.height, p.radius).fill({ color, alpha });
				}
			}}
		/>
	);
}

export default ParallaxLayer;
