export interface Particle {
	/** Unit-square position, `0`..`1`. */
	x: number;
	y: number;
	radius: number;
}

// ponytail: GLSL-style sine hash, not a real PRNG — fine for scattering a
// couple dozen decorative dots, revisit only if the pattern reads as
// repetitive.
function hash(i: number, seed: number): number {
	const x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
	return x - Math.floor(x);
}

/**
 * `count` particles scattered across the unit square, drifting downward as
 * `depth` increases. Each wraps back to the top after `speed` metres of
 * descent, so a fixed-size set reads as an endless parallax layer — no
 * texture, no ticker state, just `depth` in, positions out.
 */
export function parallaxParticles(count: number, depth: number, speed: number, seed: number): Particle[] {
	const particles: Particle[] = [];
	for (let i = 0; i < count; i++) {
		const y = (((hash(i, seed) + depth / speed) % 1) + 1) % 1;
		particles.push({ x: hash(i + 0.5, seed), y, radius: 1.5 + hash(i + 0.25, seed) * 2.5 });
	}
	return particles;
}
