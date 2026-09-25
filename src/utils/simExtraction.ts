import { TICK_HZ } from "./simConfig.ts";

/**
 * Everything after the hook takes: the "HOOKED!" beat, the camera's trip alone back to
 * the surface, and the landing — the man in the boat, then the crane, then the helicopter
 * as the catch demands. Pure and ticked like the rest of the sim; the client only draws it.
 * Pace lives here, so retune freely (and bump `SIM_VERSION`).
 */

/** Who is pulling on the fish. The man in the boat always starts; a heavier catch calls in more. */
export type Gear = "rod" | "crane" | "helicopter";

/** What the catch weighs, as a multiplier: 1× is a plain reel-in, 500× is the biggest fish there is. */
export const MIN_MULTIPLIER = 1;
export const MAX_MULTIPLIER = 500;

/** The smallest multiplier that calls in each extra piece of gear. Placeholder cut-offs. */
export const CRANE_FROM = 50;
export const HELICOPTER_FROM = 400;

/** Every gear this catch needs, in the order they take the strain. */
export function gearsFor(multiplier: number): Gear[] {
	if (multiplier >= HELICOPTER_FROM) return ["rod", "crane", "helicopter"];
	if (multiplier >= CRANE_FROM) return ["rod", "crane"];
	return ["rod"];
}

/** How long the "HOOKED!" splash holds, the fish staying where it is. */
export const ANNOUNCE_TICKS = Math.round(1.6 * TICK_HZ);

/** The camera's trip back up alone: this fast, never quicker than `MIN` or slower than `MAX`. */
const ASCENT_METERS_PER_SECOND = 1500;
const MIN_ASCENT_SECONDS = 1;
const MAX_ASCENT_SECONDS = 3.5;

export function ascentTicks(catchM: number): number {
	const seconds = Math.min(MAX_ASCENT_SECONDS, Math.max(MIN_ASCENT_SECONDS, catchM / ASCENT_METERS_PER_SECOND));
	return Math.round(seconds * TICK_HZ);
}

/** Camera depth `tick` ticks into the ascent: eased out of the catch depth and into the surface. */
export function ascentDepth(catchM: number, tick: number): number {
	const u = Math.min(1, tick / ascentTicks(catchM));
	return catchM * (1 - u * u * (3 - 2 * u));
}

/** One gear's turn on the line, in seconds. While it is `callIn` the fish holds where the last gear
 *  left it; then it lifts the fish until `to` (0..1) of it is out of the water. */
interface Turn {
	gear: Gear;
	callIn: number;
	lift: number;
	to: number;
}

/** The crane takes this long to come out from its pier and get its cable to the hook. Then it lifts: slowly, so the
 *  fish feels heavy and the wait for the whole of it to come out of the water builds. */
const CRANE_CALL_IN = 2.4;
const CRANE_LIFT = 8;

/** Indexed by how many gears the catch needs. Each gear before the last only gets the fish partway. */
const SCHEDULES: readonly (readonly Turn[])[] = [
	[{ gear: "rod", callIn: 0, lift: 1.8, to: 1 }],
	[
		{ gear: "rod", callIn: 0, lift: 1.2, to: 0.1 },
		{ gear: "crane", callIn: CRANE_CALL_IN, lift: CRANE_LIFT, to: 1 }
	],
	[
		{ gear: "rod", callIn: 0, lift: 1.2, to: 0.1 },
		{ gear: "crane", callIn: CRANE_CALL_IN, lift: 3, to: 0.55 },
		{ gear: "helicopter", callIn: 1.8, lift: 4, to: 1 }
	]
];

/** The hook is hauled to the surface in this long — faster for a shallow catch, capped for a deep one. */
const HAUL_METERS_PER_SECOND = 2000;
const MIN_HAUL_SECONDS = 0.9;
const MAX_HAUL_SECONDS = 2.2;
/** The catch hangs out of the water this long before the round ends. */
const HOLD_SECONDS = 1.8;

function haulSeconds(catchM: number): number {
	return Math.min(MAX_HAUL_SECONDS, Math.max(MIN_HAUL_SECONDS, catchM / HAUL_METERS_PER_SECOND));
}

export function extractionTicks(gears: readonly Gear[], catchM: number): number {
	const turns = SCHEDULES[gears.length - 1].reduce((sum, { callIn, lift }) => sum + callIn + lift, 0);
	return Math.round((haulSeconds(catchM) + turns + HOLD_SECONDS) * TICK_HZ);
}

export interface Extraction {
	stage: "haul" | Gear | "hold";
	/** The hook's depth on its way to the surface; 0 once it is there. */
	depthM: number;
	/** How much of the fish is out of the water: 0 is its lips at the surface, 1 its tail clear. */
	reveal: number;
	/** How far each extra piece of gear has been called in: 0 idle in the harbour, 1 on the job. */
	arrival: Record<"crane" | "helicopter", number>;
}

/** The landing `tick` ticks after the hook was let go of, for a catch taken at `catchM`. */
export function extractionAt(gears: readonly Gear[], catchM: number, tick: number): Extraction {
	const arrival = { crane: 0, helicopter: 0 };
	const haul = haulSeconds(catchM);
	let t = tick / TICK_HZ;
	if (t < haul) {
		const left = 1 - t / haul;
		return { stage: "haul", depthM: catchM * left * left, reveal: 0, arrival };
	}

	t -= haul;
	let from = 0;
	for (const { gear, callIn, lift, to } of SCHEDULES[gears.length - 1]) {
		if (gear !== "rod") arrival[gear] = Math.min(1, t / callIn);
		if (t < callIn + lift) {
			const u = Math.max(0, (t - callIn) / lift);
			return { stage: gear, depthM: 0, reveal: from + (to - from) * u * u * (3 - 2 * u), arrival };
		}
		t -= callIn + lift;
		from = to;
	}
	return { stage: "hold", depthM: 0, reveal: 1, arrival };
}
