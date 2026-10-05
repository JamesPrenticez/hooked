import { PX_PER_METER, SIM_FISH, SIM_WIDTH, TICK_HZ } from "./simConfig.ts";
import { seededRandom } from "./simRandom.ts";

export interface WorldFish {
	/** Roster id. */
	id: string;
	/** `Species.id` of the sheet it is drawn with. */
	art: string;
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
 * Scatters every `SIM_FISH` through its depth band: each band is cut into `count`
 * slices with one fish per slice, so a `worldSeed` alone fixes every fish.
 */
export function spawnWorld(worldSeed: number): WorldFish[] {
	const random = seededRandom(worldSeed);
	return SIM_FISH.flatMap(f =>
		Array.from({ length: f.count }, (_, i): WorldFish => {
			const slice = (f.toMeters - f.fromMeters) / f.count;
			const width = f.cellW * f.scale;
			const height = f.cellH * f.scale;
			return {
				id: f.id,
				art: f.art,
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

/** Sprite centre x at `tick`, sim px — a closed form, so any tick is one call. Loops off-screen and back. */
export function fishX(fish: WorldFish, tick: number): number {
	const progress = ((tick / TICK_HZ) * fish.speed + fish.offset) % (SIM_WIDTH + fish.width);
	return fish.direction === -1 ? SIM_WIDTH + fish.width / 2 - progress : progress - fish.width / 2;
}

/** Sprite centre y, sim px below the surface. */
export function fishY(fish: WorldFish): number {
	return fish.meters * PX_PER_METER;
}

/** The mouth's contact circle at `tick`, in the sim's px space. */
export function mouthAt(fish: WorldFish, tick: number): { x: number; y: number; r: number } {
	return {
		x: fishX(fish, tick) - fish.direction * fish.mouth.dx,
		y: fishY(fish) + fish.mouth.dy,
		r: fish.mouth.r
	};
}
