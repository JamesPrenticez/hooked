import { create } from "zustand";
import { persist } from "zustand/middleware";

import { DEPTH_ZONES, type DepthUnit, type DepthZone, type ZoneId } from "@constants/depthZones";

// Default descent speed per zone, in metres/second — decreasing with depth so
// the hook visibly slows the deeper it goes, on top of the hard deceleration
// `useDescentDepth` applies approaching the max depth.
const DEFAULT_ZONE_SPEEDS: Record<ZoneId, number> = {
	shallow: 220,
	reef: 170,
	deep: 130,
	abyss: 90,
	trench: 55,
	jackpot: 40
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
	zoneSpeeds: Record<ZoneId, number>;
	setZoneFromMeters: (id: ZoneId, meters: number) => void;
	setZoneSpeed: (id: ZoneId, metersPerSecond: number) => void;

	/** Restores every override above to its default. */
	resetDefaults: () => void;
}

const getDefaults = () => ({
	timeOfDay: 0.5,
	frozen: false,
	depthUnit: "m" as DepthUnit,
	depthZones: DEPTH_ZONES.map(zone => ({ ...zone })),
	zoneSpeeds: { ...DEFAULT_ZONE_SPEEDS }
});

export const useDebugStore = create<DebugStore>()(
	persist(
		set => ({
			...getDefaults(),
			setTimeOfDay: t => set({ timeOfDay: t }),
			setFrozen: frozen => set({ frozen }),
			setDepthUnit: unit => set({ depthUnit: unit }),
			resetDefaults: () => set(getDefaults()),

			setZoneFromMeters: (id, meters) =>
				set(state => ({
					depthZones: state.depthZones.map(zone => (zone.id === id ? { ...zone, fromMeters: meters } : zone))
				})),
			setZoneSpeed: (id, metersPerSecond) =>
				set(state => ({ zoneSpeeds: { ...state.zoneSpeeds, [id]: metersPerSecond } }))
		}),
		{ name: "deepcatch.debug", version: 1, migrate: getDefaults }
	)
);
