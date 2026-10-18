import { PX_PER_METER, SIM_WIDTH, TICK_HZ } from "./simConfig.ts";
import { seededRandom } from "./simRandom.ts";
// The one `../` import: the fish table is shared with the client, and Node resolves it by path.
// eslint-disable-next-line no-restricted-imports
import { HOOKABLE_FISH } from "../constants/fish.ts";

export interface WorldFish {
	/** Roster id. */
	id: string;
	meters: number;
	/** -1 swims right-to-left (the art's native way), 1 is mirrored. */
	direction: -1 | 1;
	/** Sim px/s. */
	speed: number;
	/** Head start along the loop, px. */
	offset: number;
	/** Seconds added to the animation clock so a shoal doesn't flap in unison. */
	phase: number;
	/** Sprite size in sim px. */
	width: number;
	height: number;
	/** Mouth circle for left-facing art, px from the sprite centre; `mouthAt` mirrors it. */
	mouth: { dx: number; dy: number; r: number };
}

/**
 * Scatters every `HOOKABLE_FISH` through its depth band: each band is cut into `count`
 * slices with one fish per slice, so a `worldSeed` alone fixes every fish.
 */
export function spawnWorld(worldSeed: number): WorldFish[] {
	const random = seededRandom(worldSeed);
	return HOOKABLE_FISH.flatMap(f =>
		Array.from({ length: f.count }, (_, i): WorldFish => {
			const slice = (f.toMeters - f.fromMeters) / f.count;
			const width = f.art.cellW * f.scale;
			const height = f.art.cellH * f.scale;
			return {
				id: f.id,
				meters: f.fromMeters + slice * (i + random()),
				direction: random() < 0.5 ? -1 : 1,
				speed: f.speed * (0.8 + random() * 0.4),
				offset: random() * 4000,
				phase: random() * 10,
				width,
				height,
				mouth: {
					dx: f.mouth.x * width,
					dy: f.mouth.y * height,
					r: f.mouth.r * width
				}
			};
		})
	);
}

/**
 * A fish ping-ponging between the side walls, in closed form so any moment is one call: the sprite
 * centre `x` in `0..width` and the `direction` it faces then (-1 left, 1 right). It turns round
 * when its sprite touches a wall.
 */
export function swimPose(
	fish: Pick<WorldFish, "direction" | "speed" | "offset">,
	fishWidth: number,
	width: number,
	seconds: number
): { x: number; direction: -1 | 1 } {
	const span = width - fishWidth;
	const progress = (seconds * fish.speed + fish.offset) % (2 * span);
	const outbound = progress < span;
	const travelled = outbound ? progress : 2 * span - progress;
	return {
		x: fish.direction === -1 ? width - fishWidth / 2 - travelled : fishWidth / 2 + travelled,
		direction: outbound ? fish.direction : (-fish.direction as -1 | 1)
	};
}

/** Sprite centre x at `tick`, sim px. */
export function fishX(fish: WorldFish, tick: number): number {
	return swimPose(fish, fish.width, SIM_WIDTH, tick / TICK_HZ).x;
}

/** The way the fish faces at `tick`: -1 left (the art's native way), 1 mirrored. */
export function fishHeading(fish: WorldFish, tick: number): -1 | 1 {
	return swimPose(fish, fish.width, SIM_WIDTH, tick / TICK_HZ).direction;
}

/** Sprite centre y, sim px below the surface. */
export function fishY(fish: WorldFish): number {
	return fish.meters * PX_PER_METER;
}

/** The mouth's contact circle at `tick`, in the sim's px space. */
export function mouthAt(fish: WorldFish, tick: number): { x: number; y: number; r: number } {
	return {
		x: fishX(fish, tick) - fishHeading(fish, tick) * fish.mouth.dx,
		y: fishY(fish) + fish.mouth.dy,
		r: fish.mouth.r
	};
}
