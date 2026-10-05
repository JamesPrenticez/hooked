import { TICK_HZ } from "./simConfig.ts";

/**
 * Everything after the hook takes: the "HOOKED!" beat, the camera's trip alone back to
 * the surface, and the landing — the man in the boat, then the crane, then the helicopter
 * as the catch demands. Pure and ticked like the rest of the sim; the client only draws it.
 * Pace lives here, so retune freely (and bump `SIM_VERSION`).
 */

/** Who is pulling on the fish. The man in the boat always starts; a heavier catch calls in more. */
export type Gear = "rod" | "crane" | "helicopter" | "chinook";
const GEAR_ORDER: readonly Gear[] = ["rod", "crane", "helicopter", "chinook"];

/** What the catch weighs, as a multiplier: 1× is a plain reel-in, 500× is the biggest fish there is. */
export const MIN_MULTIPLIER = 1;
export const MAX_MULTIPLIER = 500;

/** The smallest multiplier that calls in each extra piece of gear. Placeholder cut-offs. */
export const CRANE_FROM = 20;
export const HELICOPTER_FROM = 60;
export const CHINOOK_FROM = 150;

/** Every gear this catch needs, in the order they take the strain. */
export function gearsFor(multiplier: number): Gear[] {
	const extra = [CRANE_FROM, HELICOPTER_FROM, CHINOOK_FROM].filter(from => multiplier >= from).length;
	return GEAR_ORDER.slice(0, extra + 1);
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

/** One gear's turn on the line, in seconds. While it is `callIn` the fish holds where the last gear left it; then the
 *  gear `strain`s, pulling hard on a fish that is stuck fast; then it lifts the fish until `to` (0..1) of it is out. */
interface Turn {
	gear: Gear;
	callIn: number;
	strain: number;
	lift: number;
	to: number;
}

/** How long each extra gear takes to come out to the job and get its cable to the hook. */
const CALL_IN: Record<Exclude<Gear, "rod">, number> = {
	crane: 2.4,
	helicopter: 1.8,
	chinook: 2.4
};
/** Then it pulls and the fish doesn't budge: the wait for it to give is what builds the suspense. */
const STRAIN_SECONDS = 1.5;
/** The strain while a gear is still coming out to the job: the last one is holding a fish that is stuck fast. */
const CALL_IN_STRAIN = 0.4;
/** The rod gets the lips out of the water, and no more, before it needs help. */
const ROD_SHARE = 0.1;
const ROD_STRAIN_SECONDS = 1.6;
/** The extra gear lift the rest of the fish out this slowly, seconds for all of it, so it feels heavy. */
const LIFT_SECONDS = 8;

/** Each gear before the last only gets the fish partway. A catch the rod lands alone isn't strained at all. */
function scheduleFor(gears: readonly Gear[]): Turn[] {
	if (gears.length === 1) return [{ gear: "rod", callIn: 0, strain: 0, lift: 1.8, to: 1 }];
	const step = (1 - ROD_SHARE) / (gears.length - 1);
	return gears.map((gear, i) =>
		gear === "rod"
			? {
					gear,
					callIn: 0,
					strain: ROD_STRAIN_SECONDS,
					lift: 1.2,
					to: ROD_SHARE
				}
			: {
					gear,
					callIn: CALL_IN[gear],
					strain: STRAIN_SECONDS,
					lift: LIFT_SECONDS * step,
					to: ROD_SHARE + step * i
				}
	);
}

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
	const turns = scheduleFor(gears).reduce((sum, { callIn, strain, lift }) => sum + callIn + strain + lift, 0);
	return Math.round((haulSeconds(catchM) + turns + HOLD_SECONDS) * TICK_HZ);
}

export interface Extraction {
	stage: "haul" | Gear | "hold";
	/** The hook's depth on its way to the surface; 0 once it is there. */
	depthM: number;
	/** How much of the fish is out of the water: 0 is its lips at the surface, 1 its tail clear. */
	reveal: number;
	/** How far each extra piece of gear has been called in: 0 idle in the harbour, 1 on the job. */
	arrival: Record<Exclude<Gear, "rod">, number>;
	/** How hard the gear on the line is pulling against a fish that won't come, 0..1: it builds to the moment it gives. */
	strain: number;
}

/** The landing `tick` ticks after the hook was let go of, for a catch taken at `catchM`. */
export function extractionAt(gears: readonly Gear[], catchM: number, tick: number): Extraction {
	const arrival = { crane: 0, helicopter: 0, chinook: 0 };
	const haul = haulSeconds(catchM);
	let t = tick / TICK_HZ;
	if (t < haul) {
		const left = 1 - t / haul;
		return {
			stage: "haul",
			depthM: catchM * left * left,
			reveal: 0,
			arrival,
			strain: 0
		};
	}

	t -= haul;
	let from = 0;
	for (const { gear, callIn, strain, lift, to } of scheduleFor(gears)) {
		if (gear !== "rod") arrival[gear] = Math.min(1, t / callIn);
		if (t < callIn + strain + lift) {
			const u = Math.max(0, (t - callIn - strain) / lift);
			const held =
				t < callIn
					? gear === "rod"
						? 0
						: CALL_IN_STRAIN
					: CALL_IN_STRAIN + (1 - CALL_IN_STRAIN) * ((t - callIn) / strain);
			return {
				stage: gear,
				depthM: 0,
				reveal: from + (to - from) * u * u * (3 - 2 * u),
				arrival,
				strain: t < callIn + strain ? held : 0
			};
		}
		t -= callIn + strain + lift;
		from = to;
	}
	return { stage: "hold", depthM: 0, reveal: 1, arrival, strain: 0 };
}

/** The multiplier the readout shows: it climbs as the fish comes out of the water, holds while a gear strains against
 *  it, and lands on the catch's real multiplier once it is all out. */
export const shownMultiplier = (multiplier: number, reveal: number) =>
	Math.round(MIN_MULTIPLIER + (multiplier - MIN_MULTIPLIER) * reveal);
