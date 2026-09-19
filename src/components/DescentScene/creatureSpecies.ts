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

import type { SheetAnimation } from "./spriteSheet";

export interface Species {
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

const swim = (frameCount: number, fps = 10): SheetAnimation => ({ row: 1, fps, frameCount });

/** Bands follow the zone order in `constants/fish.ts`, except the lanternfish and
 *  whale, which live down in the trench (9,500m+) — capped at 10,500m so the Kraken
 *  keeps the jackpot layer (10,600m+). All the art faces left. */
export const SPECIES: Species[] = [
	// shallow
	{
		url: shrimp,
		opaque: true,
		cols: 8,
		swim: swim(8),
		scale: 0.55,
		speed: 35,
		fromMeters: 120,
		toMeters: 1400,
		count: 5
	},
	{ url: mackerel, cols: 8, swim: swim(8), scale: 0.7, speed: 90, fromMeters: 150, toMeters: 1500, count: 6 },
	{
		url: barracuda,
		opaque: true,
		cols: 8,
		swim: swim(8),
		scale: 0.9,
		speed: 130,
		fromMeters: 500,
		toMeters: 2500,
		count: 4
	},
	// reef
	{
		url: napoleon,
		opaque: true,
		cols: 8,
		swim: swim(8),
		scale: 0.8,
		speed: 55,
		fromMeters: 1500,
		toMeters: 3500,
		count: 5
	},
	{
		url: turtle,
		opaque: true,
		cols: 8,
		swim: swim(8, 8),
		scale: 0.85,
		speed: 40,
		fromMeters: 1600,
		toMeters: 3900,
		count: 4
	},
	{
		url: pike,
		opaque: true,
		cols: 8,
		swim: swim(8),
		scale: 0.9,
		speed: 110,
		fromMeters: 1500,
		toMeters: 3800,
		count: 4
	},
	{ url: crab, cols: 8, swim: swim(8), scale: 0.5, speed: 40, fromMeters: 1600, toMeters: 3900, count: 4 },
	// deep
	{
		url: manta,
		opaque: true,
		cols: 9,
		swim: swim(9, 8),
		scale: 1.2,
		speed: 60,
		fromMeters: 4000,
		toMeters: 6800,
		count: 4
	},
	{ url: tuna, cols: 8, swim: swim(8), scale: 1, speed: 140, fromMeters: 4000, toMeters: 6900, count: 5 },
	{ url: puffer, cols: 8, swim: swim(8), scale: 0.7, speed: 45, fromMeters: 4100, toMeters: 6900, count: 4 },
	{
		url: shark,
		opaque: true,
		cols: 8,
		swim: swim(8),
		scale: 2.3,
		speed: 100,
		fromMeters: 4300,
		toMeters: 7000,
		count: 3
	},
	// abyss
	{
		url: lantern,
		opaque: true,
		cols: 8,
		swim: swim(8),
		scale: 0.75,
		speed: 45,
		fromMeters: 9600,
		toMeters: 10500,
		count: 5
	},
	{
		url: jelly,
		opaque: true,
		cols: 8,
		swim: swim(8, 8),
		scale: 0.6,
		speed: 20,
		fromMeters: 7000,
		toMeters: 9400,
		count: 6
	},
	{
		url: whale,
		opaque: true,
		cols: 8,
		swim: swim(8, 8),
		scale: 4.5,
		speed: 30,
		fromMeters: 9700,
		toMeters: 10500,
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

/** mulberry32 — tiny seeded PRNG, so the world is the same every session. */
function seededRandom(seed: number) {
	return () => {
		seed = (seed + 0x6d2b79f5) | 0;
		let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
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
