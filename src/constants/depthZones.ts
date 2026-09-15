import type { DepthId } from "@type/api";

/** Presentation data for each depth zone. The betting-board reference
 *  (mobile-reference.webp) uses real metre ranges (200/1,000/3,000/6,000),
 *  but at `useDescentDepth`'s pace those flew by in under a second — these
 *  are paced instead, spaced so a full descent to the trench (the very
 *  bottom) takes ~30s at the current descent speed. */
export interface DepthZone {
	id: DepthId;
	label: string;
	/** Meters where this zone begins. */
	fromMeters: number;
}

export const DEPTH_ZONES: DepthZone[] = [
	{ id: "shallow", label: "Shallow", fromMeters: 0 },
	{ id: "reef", label: "Reef", fromMeters: 800 },
	{ id: "deep", label: "Deep", fromMeters: 2200 },
	{ id: "abyss", label: "Abyss", fromMeters: 4200 },
	{ id: "trench", label: "Trench", fromMeters: 6600 }
];

/** The zone `depth` metres currently sits in. */
export function zoneForDepth(depth: number): DepthZone {
	let zone = DEPTH_ZONES[0];
	for (const candidate of DEPTH_ZONES) {
		if (depth < candidate.fromMeters) break;
		zone = candidate;
	}
	return zone;
}
