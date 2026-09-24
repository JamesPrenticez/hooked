import barracuda from "@assets/creatures/barracuda.png";
import crab from "@assets/creatures/crab.png";
import jelly from "@assets/creatures/jelly.png";
import lantern from "@assets/creatures/lantern.png";
import mackerel from "@assets/creatures/mackeral.png";
import manta from "@assets/creatures/manta ray.png";
import napoleon from "@assets/creatures/neoplean.png";
import pike from "@assets/creatures/pike.png";
import puffer from "@assets/creatures/puffer.png";
import shark from "@assets/creatures/shark.png";
import shrimp from "@assets/creatures/shrimp.png";
import tuna from "@assets/creatures/tuna.png";
import turtle from "@assets/creatures/turtle.png";
import whale from "@assets/creatures/whale.png";
import { seededRandom } from "@utils/simRandom";

import type { SheetAnimation } from "./spriteSheet";

export interface Species {
	/** Sheet key — `SimFish.art` points here. */
	id: string;
	url: string;
	/** Cells per row — the export's real grid, not the tile size in `animations.json`. */
	cols: number;
	/** Swim row: row 1 on every sheet; frame count and fps from `animations.json`. */
	swim: SheetAnimation;
	/** The sheet is an RGB PNG on solid black (no alpha) — drawn with a screen blend so the black drops out. */
	opaque?: boolean;
	scale: number;
	/** Cruise speed, screen px/s. */
	speed: number;
	/** Depth band the fish are spread through, in metres. */
	fromMeters: number;
	toMeters: number;
	/** How many of this species live in the world. */
	count: number;
}

export const SHEET_ROWS = 4;

/** Bite row (2) plays once when a fish is hooked, then the struggle row (3) loops. Every
 *  sheet has 6 bite frames and 8 struggle frames but the tuna's 5 bite frames. */
export const BITE: SheetAnimation = { row: 2, fps: 12, frameCount: 6 };
export const STRUGGLE: SheetAnimation = { row: 3, fps: 12, frameCount: 8 };

const swim = (frameCount: number, fps = 10): SheetAnimation => ({ row: 1, fps, frameCount });

/** Bands follow the zone order in `constants/fish.ts`, except the lanternfish and
 *  whale, which live down in the trench (9,785m+) — capped at 10,825m (the whale, being
 *  huge, at 10,675m) so the Kraken keeps the jackpot layer (10,935m+). All the art faces left. */
export const SPECIES: Species[] = [
	// shallow
	{
		id: "shrimp",
		url: shrimp,
		opaque: true,
		cols: 8,
		swim: swim(8),
		scale: 0.55,
		speed: 35,
		fromMeters: 110,
		toMeters: 1420,
		count: 5
	},
	{
		id: "mackerel",
		url: mackerel,
		cols: 8,
		swim: swim(8),
		scale: 0.7,
		speed: 90,
		fromMeters: 165,
		toMeters: 1530,
		count: 6
	},
	{
		id: "barracuda",
		url: barracuda,
		opaque: true,
		cols: 8,
		swim: swim(8),
		scale: 0.9,
		speed: 130,
		fromMeters: 490,
		toMeters: 2570,
		count: 4
	},
	// reef
	{
		id: "napoleon",
		url: napoleon,
		opaque: true,
		cols: 8,
		swim: swim(8),
		scale: 0.8,
		speed: 55,
		fromMeters: 1530,
		toMeters: 3610,
		count: 5
	},
	{
		id: "turtle",
		url: turtle,
		opaque: true,
		cols: 8,
		swim: swim(8, 8),
		scale: 0.85,
		speed: 40,
		fromMeters: 1640,
		toMeters: 4045,
		count: 4
	},
	{
		id: "pike",
		url: pike,
		opaque: true,
		cols: 8,
		swim: swim(8),
		scale: 0.9,
		speed: 110,
		fromMeters: 1530,
		toMeters: 3935,
		count: 4
	},
	{ id: "crab", url: crab, cols: 8, swim: swim(8), scale: 0.5, speed: 40, fromMeters: 1640, toMeters: 4045, count: 4 },
	// deep
	{
		id: "manta",
		url: manta,
		opaque: true,
		cols: 9,
		swim: swim(9, 8),
		scale: 1.2,
		speed: 60,
		fromMeters: 4100,
		toMeters: 7000,
		count: 4
	},
	{ id: "tuna", url: tuna, cols: 8, swim: swim(8), scale: 1, speed: 140, fromMeters: 4100, toMeters: 7110, count: 5 },
	{
		id: "puffer",
		url: puffer,
		cols: 8,
		swim: swim(8),
		scale: 0.7,
		speed: 45,
		fromMeters: 4210,
		toMeters: 7110,
		count: 4
	},
	{
		id: "shark",
		url: shark,
		opaque: true,
		cols: 8,
		swim: swim(8),
		scale: 2.3,
		speed: 100,
		fromMeters: 4430,
		toMeters: 7215,
		count: 3
	},
	// abyss
	{
		id: "lantern",
		url: lantern,
		opaque: true,
		cols: 8,
		swim: swim(8),
		scale: 0.75,
		speed: 45,
		fromMeters: 9895,
		toMeters: 10825,
		count: 5
	},
	{
		id: "jelly",
		url: jelly,
		opaque: true,
		cols: 8,
		swim: swim(8, 8),
		scale: 0.6,
		speed: 20,
		fromMeters: 7215,
		toMeters: 9675,
		count: 6
	},
	{
		id: "whale",
		url: whale,
		opaque: true,
		cols: 6,
		swim: swim(6, 8),
		scale: 4.5,
		speed: 30,
		fromMeters: 10005,
		toMeters: 10675,
		count: 2
	}
];

export interface Creature {
	species: Species;
	meters: number;
	/** -1 swims right-to-left (the art's native way), 1 is mirrored. */
	direction: -1 | 1;
	speed: number;
	/** Head start along the loop, px, so fish don't all begin at the screen edge. */
	offset: number;
	/** Seconds added to the animation clock so a shoal doesn't flap in unison. */
	phase: number;
}

/**
 * Scatters every species through its depth band. Each species' band is split
 * into `count` slices with one fish per slice, so several of a kind spread out
 * rather than clumping.
 */
export function spawnCreatures(species: Species[] = SPECIES, seed = 1): Creature[] {
	const random = seededRandom(seed);
	return species.flatMap(s =>
		Array.from({ length: s.count }, (_, i): Creature => {
			const slice = (s.toMeters - s.fromMeters) / s.count;
			return {
				species: s,
				meters: s.fromMeters + slice * (i + random()),
				direction: random() < 0.5 ? -1 : 1,
				speed: s.speed * (0.8 + random() * 0.4),
				offset: random() * 4000,
				phase: random() * 10
			};
		})
	);
}

export const CREATURES = spawnCreatures();
