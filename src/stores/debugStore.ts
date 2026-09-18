import { create } from "zustand";

import { DEPTH_ZONES, type DepthUnit, type DepthZone } from "@constants/depthZones";
import type { DepthId } from "@type/api";

// Default descent speed per zone, in metres/second — decreasing with depth so
// the hook visibly slows the deeper it goes, on top of the hard deceleration
// `useDescentDepth` applies approaching the max depth.
const DEFAULT_ZONE_SPEEDS: Record<DepthId, number> = {
	shallow: 220,
	reef: 170,
	deep: 130,
	abyss: 90,
	trench: 55
};

// Dev-only overrides surfaced by the DEBUG panel (bottom-right, all phases).
// Categories grow here as more get debug controls — environment and hook
// (depth zones/speed) are the first two.
interface DebugStore {
	/** Manual time-of-day (`[0, 1)`), used in place of the live clock while frozen. */
	timeOfDay: number;
	/** Stops `useDayNightClock` from advancing — the range slider drives `timeOfDay` instead. */
	frozen: boolean;
	setTimeOfDay: (t: number) => void;
	setFrozen: (frozen: boolean) => void;

	/** Unit the depth HUD/markers render in — doesn't affect the underlying metres. */
	depthUnit: DepthUnit;
	setDepthUnit: (unit: DepthUnit) => void;

	/** Where each tier starts, in metres — `useDescentDepth` and every depth
	 *  display read this instead of the static `DEPTH_ZONES` default. */
	depthZones: DepthZone[];
	/** Descent speed while the hook is in each tier, in metres/second. */
	zoneSpeeds: Record<DepthId, number>;
	setZoneFromMeters: (id: DepthId, meters: number) => void;
	setZoneSpeed: (id: DepthId, metersPerSecond: number) => void;
}

export const useDebugStore = create<DebugStore>(set => ({
	timeOfDay: 0.5,
	frozen: false,
	setTimeOfDay: t => set({ timeOfDay: t }),
	setFrozen: frozen => set({ frozen }),

	depthUnit: "m",
	setDepthUnit: unit => set({ depthUnit: unit }),

	depthZones: DEPTH_ZONES.map(zone => ({ ...zone })),
	zoneSpeeds: { ...DEFAULT_ZONE_SPEEDS },
	setZoneFromMeters: (id, meters) =>
		set(state => ({
			depthZones: state.depthZones.map(zone => (zone.id === id ? { ...zone, fromMeters: meters } : zone))
		})),
	setZoneSpeed: (id, metersPerSecond) => set(state => ({ zoneSpeeds: { ...state.zoneSpeeds, [id]: metersPerSecond } }))
}));
