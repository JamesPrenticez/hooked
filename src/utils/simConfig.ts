/**
 * Frozen snapshot of the numbers the sim runs on. Bump `SIM_VERSION` whenever
 * one changes a trajectory; `simConfig.test.ts` fails if it drifts from the
 * live auto-descent values. No imports — runs under Node.
 */
export const SIM_VERSION = 3;
export const TICK_HZ = 60;
/** Sim world width in px (the desktop reference); the client scales it to the view. */
export const SIM_WIDTH = 1920;

export const MAX_DEPTH_METERS = 11_400;
export const PX_PER_METER = 0.6;
/** Mouth tests arm from here (29.2), once the cast blend is over. */
export const CAST_METERS = 300;

/** Reel-in speed (m/s) and the Kraken fight — frozen from the live auto scene. The Kraken is reeled in whole;
 *  a fish is landed by `simExtraction.ts`. */
export const REEL_METERS_PER_SECOND = 600;
export const KRAKEN_FIGHT_TICKS = 8 * TICK_HZ;
/** How long the hooked fish fights the hook underwater: its bite beat, then the struggle loop. */
export const HOOKED_TICKS = Math.round(1.5 * TICK_HZ);

/** Depth zones ascending: where each starts and its descent speed (m/s). */
export const ZONES = [
	{ id: "shallow", fromMeters: 0, speed: 220 },
	{ id: "reef", fromMeters: 1530, speed: 170 },
	{ id: "deep", fromMeters: 4100, speed: 130 },
	{ id: "abyss", fromMeters: 7215, speed: 90 },
	{ id: "trench", fromMeters: 9785, speed: 55 },
	{ id: "jackpot", fromMeters: 10_935, speed: 40 }
] as const;

/** Final fraction of the descent that eases to a stop, and the speed floor while it does. */
export const DECEL_FRACTION = 0.1;
export const MIN_DESCENT_METERS_PER_SECOND = 25;

// Steering: vx = (vx + axis·HOOK_ACCEL)·HOOK_DRAG per tick, in px/s. Terminal
// speed ≈ ACCEL·DRAG/(1−DRAG) ≈ 1,380 px/s — edge to edge in ≈1.5 s.
export const HOOK_ACCEL = 120;
export const HOOK_DRAG = 0.92;
export const HOOK_MAX_VX = 1400;

/** The hook's contact point: a circle of `HOOK_R` sim px, `HOOK_TIP_DY` below the line end. */
export const HOOK_R = 12;
export const HOOK_TIP_DY = 80;

/** A mouth's contact circle as fractions of the sprite cell, from its centre, for left-facing art. */
export interface Mouth {
	/** Of cell width. */
	x: number;
	/** Of cell height. */
	y: number;
	/** Of cell width. */
	r: number;
}

export interface SimFish {
	/** Roster id (`constants/fish.ts`) — what a hooked fish reports. */
	id: string;
	/** `Species.id` of the sheet it is drawn with; stand-ins reuse another fish's sheet. */
	art: string;
	/** One sprite cell of that sheet, px, before `scale`. */
	cellW: number;
	cellH: number;
	scale: number;
	/** Cruise speed, sim px/s. */
	speed: number;
	/** Depth band and how many live in it. */
	fromMeters: number;
	toMeters: number;
	count: number;
	mouth: Mouth;
}

/** Seed for every species until the hit-box overlay says otherwise. */
const MOUTH: Mouth = { x: -0.4, y: 0.05, r: 0.12 };

const S = 221.75; // the common 1774×887 sheet: 8 cols × 4 rows

const fish = (
	id: string,
	art: string,
	[cellW, cellH]: [number, number],
	scale: number,
	speed: number,
	fromMeters: number,
	toMeters: number,
	count: number
): SimFish => ({ id, art, cellW, cellH, scale, speed, fromMeters, toMeters, count, mouth: MOUTH });

/**
 * Every hookable fish, keyed by roster id (the Kraken is hooked at the bottom, not
 * by a mouth). Bands, speeds and scales are today's `SPECIES`; blue-cod,
 * barracuda-epic and starfish have no sheet yet and borrow a nearby one.
 */
export const SIM_FISH: readonly SimFish[] = [
	fish("shrimp", "shrimp", [S, S], 0.55, 35, 110, 1420, 5),
	fish("sardine", "mackerel", [S, S], 0.7, 90, 165, 1530, 6),
	fish("blue-cod", "mackerel", [S, S], 0.7, 70, 300, 1400, 3),
	fish("barracuda", "barracuda", [S, S], 0.9, 130, 490, 2570, 4),
	fish("napoleon", "napoleon", [S, S], 0.8, 55, 1530, 3610, 5),
	fish("turtle", "turtle", [S, S], 0.85, 40, 1640, 4045, 4),
	fish("swordfish", "pike", [S, S], 0.9, 110, 1530, 3935, 4),
	fish("king-crab", "crab", [512, 512], 0.5, 40, 1640, 4045, 4),
	fish("manta-ray", "manta", [185.78, 235.25], 1.2, 60, 4100, 7000, 4),
	fish("bluefin-tuna", "tuna", [S, S], 1, 140, 4100, 7110, 5),
	fish("puffer", "puffer", [S, S], 0.7, 45, 4210, 7110, 4),
	fish("shark", "shark", [S, S], 2.3, 100, 4430, 7215, 3),
	fish("barracuda-epic", "barracuda", [S, S], 0.9, 120, 4100, 7000, 2),
	fish("lanternfish", "lantern", [244, 201.5], 0.75, 45, 9895, 10_825, 5),
	fish("jellyfish", "jelly", [S, S], 0.6, 20, 7215, 9675, 6),
	fish("starfish", "crab", [512, 512], 0.5, 25, 7215, 9675, 3),
	fish("whale", "whale", [269.83, 242.75], 4.5, 30, 10_005, 10_675, 2)
];
