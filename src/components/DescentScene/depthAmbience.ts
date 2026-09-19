import { mix } from "@components/HarbourScene/ambience";
import { DEPTH_ZONES, type DepthZone, zoneForDepth } from "@constants/depthZones";

/**
 * Depth-driven ambience for the underwater environment — the water gradient
 * darkens and the top/bottom hues cool as the hook sinks, same keyframe +
 * blend technique as the harbour's day/night `computeAmbience`, but indexed
 * by metres instead of time of day (no wraparound: the jackpot layer holds).
 */
export interface DepthAmbience {
	waterTop: number;
	waterBottom: number;
	/** `0` at the surface (no darkening) .. `1` in the jackpot layer (near black) —
	 *  drives a dark overlay's alpha, standing in for light falloff. */
	darkness: number;
	/** `1` at the surface .. `0` in the dark — strength of `WaterTiles`' caustics.
	 *  Sunlight only reaches the shallows, so these die off steeply. */
	caustics: number;
	/** Same scale for the light shafts and drifting particles, which last
	 *  deeper: they fade only as fast as the light does. */
	shafts: number;
	zone: DepthZone;
}

interface Keyframe {
	at: number;
	top: number;
	bottom: number;
	darkness: number;
}

// One stop per zone, in DEPTH_ZONES' order — `at` is read off the zone
// itself so the colour shift and the zone label can never drift apart, even
// when the debug panel moves zone boundaries around at runtime.
//
// The shallow `top` is the harbour water tile's average colour
// (`water-tile.webp` ≈ #0c80b3) minus what `WaterTiles` adds on top of the
// gradient at the surface (≈ +11/+20/+23 per channel), so the waterline is a
// seam-free hand-off — every stop from there only gets darker. Re-derive it if
// the tile or the overlay strengths change. Red is absorbed first, hence ~0.
const COLOR_STOPS = [
	{ top: 0x016c9c, bottom: 0x005a86, darkness: 0 }, // shallow
	{ top: 0x005684, bottom: 0x00486c, darkness: 0.15 }, // reef
	{ top: 0x054368, bottom: 0x033154, darkness: 0.4 }, // deep
	{ top: 0x032a42, bottom: 0x021a2b, darkness: 0.68 }, // abyss
	{ top: 0x05080c, bottom: 0x000000, darkness: 0.9 }, // trench
	{ top: 0x0b0405, bottom: 0x000000, darkness: 0.95 } // jackpot
];

export function computeDepthAmbience(depth: number, zones: DepthZone[] = DEPTH_ZONES): DepthAmbience {
	const keyframes: Keyframe[] = zones.map((zone, i) => ({ at: zone.fromMeters, ...COLOR_STOPS[i] }));

	let lo = keyframes[0];
	let hi = keyframes[keyframes.length - 1];
	for (let i = 0; i < keyframes.length; i++) {
		if (keyframes[i].at <= depth) {
			lo = keyframes[i];
			hi = keyframes[i + 1] ?? keyframes[i];
		}
	}

	const span = hi.at - lo.at;
	const u = span > 0 ? Math.min(1, (depth - lo.at) / span) : 1;

	const darkness = lo.darkness + (hi.darkness - lo.darkness) * u;
	const light = 1 - darkness;

	return {
		waterTop: mix(lo.top, hi.top, u),
		waterBottom: mix(lo.bottom, hi.bottom, u),
		darkness,
		caustics: light ** 3,
		shafts: light,
		zone: zoneForDepth(depth, zones)
	};
}
