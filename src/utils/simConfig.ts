/**
 * Frozen snapshot of the numbers the sim runs on. Bump `SIM_VERSION` whenever
 * one changes a trajectory; `simConfig.test.ts` fails if it drifts from the
 * live auto-descent values. No imports — runs under Node.
 */
export const SIM_VERSION = 8;
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
