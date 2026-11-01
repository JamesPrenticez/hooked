/**
 * Frozen snapshot of the numbers the sim runs on. Bump `SIM_VERSION` whenever
 * one changes a trajectory; `simConfig.test.ts` fails if it drifts from the
 * live auto-descent values. No imports — runs under Node.
 */
export const SIM_VERSION = 12;
export const TICK_HZ = 60;
/** Sim world width in px (the desktop reference); the client scales it to the view. */
export const SIM_WIDTH = 1920;

export const MAX_DEPTH_METERS = 11_400;
export const PX_PER_METER = 0.6;
/** Mouth tests arm from here (29.2), once the cast blend is over. */
export const CAST_METERS = 300;

/** The Kraken at the bottom: it fights the hook (`KRAKEN_FIGHT_SECONDS`, frozen from the live scene), then swims back
 *  and forth with it, is hooked for a moment, and is then landed like any other catch by `simExtraction.ts`. */
export const KRAKEN_FIGHT_TICKS = 8 * TICK_HZ;
export const KRAKEN_SWIM_TICKS = 6 * TICK_HZ;
export const KRAKEN_HOOKED_TICKS = Math.round(2.5 * TICK_HZ);
/** How long the hooked fish fights the hook underwater: its bite beat, then the struggle loop. */
export const HOOKED_TICKS = Math.round(1.5 * TICK_HZ);

/** How fast the hook descends, in every zone (m/s). */
export const DESCENT_METERS_PER_SECOND = 220;

/** Depth zones ascending: where each starts. */
export const ZONES = [
	{ id: "shallow", fromMeters: 0 },
	{ id: "reef", fromMeters: 1530 },
	{ id: "deep", fromMeters: 4100 },
	{ id: "abyss", fromMeters: 7215 },
	{ id: "trench", fromMeters: 9785 },
	{ id: "jackpot", fromMeters: 10_935 }
] as const;

// Steering: vx = (vx + axis·HOOK_ACCEL)·HOOK_DRAG per tick, in px/s. Terminal
// speed ≈ ACCEL·DRAG/(1−DRAG) ≈ 1,380 px/s — edge to edge in ≈1.5 s.
export const HOOK_ACCEL = 120;
export const HOOK_DRAG = 0.92;
export const HOOK_MAX_VX = 1400;

/** The hook's contact point: a circle of `HOOK_R` sim px, `HOOK_TIP_DY` below the line end. */
export const HOOK_R = 12;
export const HOOK_TIP_DY = 80;
