import { mix } from "@components/HarbourScene/ambience";
import { DEPTH_ZONES, type DepthZone, zoneForDepth } from "@constants/depthZones";

/**
 * Depth-driven ambience for the underwater environment — the water gradient
 * darkens and the top/bottom hues cool as the hook sinks, same keyframe +
 * blend technique as the harbour's day/night `computeAmbience`, but indexed
 * by metres instead of time of day (no wraparound: trench holds).
 */
export interface DepthAmbience {
	waterTop: number;
	waterBottom: number;
	/** `0` at the surface (no darkening) .. `1` in the trench (near black) —
	 *  drives a dark overlay's alpha, standing in for light falloff. */
	darkness: number;
	zone: DepthZone;
}

interface Keyframe {
	at: number;
	top: number;
	bottom: number;
	darkness: number;
}

// One stop per DEPTH_ZONES entry, in the same order — `at` is read off the
// zone itself so the colour shift and the zone label can never drift apart.
const COLOR_STOPS = [
	{ top: 0x6fd4f0, bottom: 0x1f7fae, darkness: 0 }, // shallow
	{ top: 0x2d93c9, bottom: 0x145d85, darkness: 0.15 }, // reef
	{ top: 0x14587f, bottom: 0x0a3450, darkness: 0.4 }, // deep
	{ top: 0x0a2438, bottom: 0x05141f, darkness: 0.68 }, // abyss
	{ top: 0x05080c, bottom: 0x000000, darkness: 0.9 } // trench
];

const KEYFRAMES: Keyframe[] = DEPTH_ZONES.map((zone, i) => ({ at: zone.fromMeters, ...COLOR_STOPS[i] }));

export function computeDepthAmbience(depth: number): DepthAmbience {
	let lo = KEYFRAMES[0];
	let hi = KEYFRAMES[KEYFRAMES.length - 1];
	for (let i = 0; i < KEYFRAMES.length; i++) {
		if (KEYFRAMES[i].at <= depth) {
			lo = KEYFRAMES[i];
			hi = KEYFRAMES[i + 1] ?? KEYFRAMES[i];
		}
	}

	const span = hi.at - lo.at;
	const u = span > 0 ? Math.min(1, (depth - lo.at) / span) : 1;

	return {
		waterTop: mix(lo.top, hi.top, u),
		waterBottom: mix(lo.bottom, hi.bottom, u),
		darkness: lo.darkness + (hi.darkness - lo.darkness) * u,
		zone: zoneForDepth(depth)
	};
}
