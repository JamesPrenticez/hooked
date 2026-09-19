import type { DepthId } from "@type/api";

/** Every band of the descent. "trench" is scenery only — the bettable id at the bottom is "jackpot". */
export type ZoneId = DepthId | "trench";

/** Presentation data for each depth zone. The betting-board reference
 *  (mobile-reference.webp) uses real metre ranges (200/1,000/3,000/6,000),
 *  but at `useDescentDepth`'s pace those flew by in under a second — these
 *  are paced instead. Overridable at runtime via the debug panel's "Hook"
 *  category (`debugStore.depthZones`); this array is just the default. */
export interface DepthZone {
	id: ZoneId;
	label: string;
	/** Meters where this zone begins. */
	fromMeters: number;
}

/** The ocean's real deepest point (Mariana Trench, Challenger Deep):
 *  35,876ft / 10,935m. The hook decelerates to a stop as it nears this. */
export const MAX_DEPTH_METERS = 10_935;

/** Screen pixels per metre of depth that world objects (depth markers, fish)
 *  scroll by. Independent of `FishingLine`'s short payout animation — this is
 *  a literal world scale, chosen so 6,000m of trench crosses the screen at a
 *  readable pace rather than flashing past or taking forever. */
export const PX_PER_METER = 0.6;

export const DEPTH_ZONES: DepthZone[] = [
	{ id: "shallow", label: "Shallow", fromMeters: 0 },
	{ id: "reef", label: "Reef", fromMeters: 1500 },
	{ id: "deep", label: "Deep", fromMeters: 4000 },
	{ id: "abyss", label: "Abyss", fromMeters: 7000 },
	{ id: "trench", label: "Trench", fromMeters: 9500 },
	{ id: "jackpot", label: "Jackpot", fromMeters: 10_600 }
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

/** How coarsely `DepthIndicator`'s counter ticks, in the displayed unit. */
export const DEPTH_DISPLAY_STEP = 10;

export type DepthUnit = "m" | "ft";

const METERS_PER_FOOT = 0.3048;

export function metersToFeet(meters: number): number {
	return meters / METERS_PER_FOOT;
}

const METERS_FORMAT = new Intl.NumberFormat("en-US");

/**
 * `1,234m` or `4,050ft`, rounded — shared by `DepthIndicator` and `DepthMarkers`.
 * With `step`, floors to a multiple of it in the displayed unit (`1,200m` for step 100).
 */
export function formatDepth(meters: number, unit: DepthUnit, step?: number): string {
	const value = unit === "ft" ? metersToFeet(meters) : meters;
	const shown = step ? Math.floor(value / step) * step : Math.round(value);
	return `${METERS_FORMAT.format(shown)}${unit}`;
}
