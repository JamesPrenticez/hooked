import type { DepthId } from "@type/api";

/** Presentation data for each depth zone. The betting-board reference
 *  (mobile-reference.webp) uses real metre ranges (200/1,000/3,000/6,000),
 *  but at `useDescentDepth`'s pace those flew by in under a second — these
 *  are paced instead. Overridable at runtime via the debug panel's "Hook"
 *  category (`debugStore.depthZones`); this array is just the default. */
export interface DepthZone {
	id: DepthId;
	label: string;
	/** Meters where this zone begins. */
	fromMeters: number;
}

/** The ocean's real deepest point (Mariana Trench, Challenger Deep):
 *  35,876ft / 10,935m. The hook decelerates to a stop as it nears this. */
export const MAX_DEPTH_METERS = 10_935;

export const DEPTH_ZONES: DepthZone[] = [
	{ id: "shallow", label: "Shallow", fromMeters: 0 },
	{ id: "reef", label: "Reef", fromMeters: 1500 },
	{ id: "deep", label: "Deep", fromMeters: 4000 },
	{ id: "abyss", label: "Abyss", fromMeters: 7000 },
	{ id: "trench", label: "Trench", fromMeters: 9500 }
];

/** The zone `depth` metres currently sits in. */
export function zoneForDepth(depth: number, zones: DepthZone[] = DEPTH_ZONES): DepthZone {
	let zone = zones[0];
	for (const candidate of zones) {
		if (depth < candidate.fromMeters) break;
		zone = candidate;
	}
	return zone;
}

export type DepthUnit = "m" | "ft";

const METERS_PER_FOOT = 0.3048;

export function metersToFeet(meters: number): number {
	return meters / METERS_PER_FOOT;
}

const METERS_FORMAT = new Intl.NumberFormat("en-US");

/** `1,234m` or `4,050ft`, rounded — shared by `DepthIndicator` and `DepthMarkers`. */
export function formatDepth(meters: number, unit: DepthUnit): string {
	const value = unit === "ft" ? metersToFeet(meters) : meters;
	return `${METERS_FORMAT.format(Math.round(value))}${unit}`;
}
