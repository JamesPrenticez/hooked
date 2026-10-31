import { DEPTH_ZONES } from "@constants/depthZones";
import { FISH } from "@constants/fish";
import type { DepthId, MarketEntry } from "@type/api";

/** Each chip drops onto its place after the one before it, `STAGGER_MS` apart, each taking `DROP_MS` to land. */
export const STAGGER_MS = 55;
export const DROP_MS = 500;
/** How long the first chip waits before it drops. */
export const FIRST_DROP_MS = 250;

/** How long the whole deal takes for `chips` chips, in ms. */
export const dealMs = (chips: number) => FIRST_DROP_MS + Math.max(0, chips - 1) * STAGGER_MS + DROP_MS;

export interface PricedFish {
	id: string;
	name: string;
	/** One still portrait; the fish without one are drawn by name. */
	image?: string;
	/** Multiples of the stake, for display only — the server pays by the decimal string (Rule 6b). */
	multiplier: number;
}

export interface MarketZone {
	id: DepthId;
	label: string;
	fish: PricedFish[];
	/** The dearest price in the zone this round. */
	best: number;
}

/** The round's market grouped by depth zone, shallowest first, each zone's fish in roster order — so a fish keeps its
 *  place on the board and only its price changes. A fish the client has no art for is left off. */
export function marketZones(market: MarketEntry[]): MarketZone[] {
	const price = new Map(market.map(entry => [entry.fish, Number(entry.multiplier)]));
	return DEPTH_ZONES.flatMap(({ id, label }) => {
		if (id === "trench") return [];
		const fish = FISH.filter(f => f.depth === id && price.has(f.id)).map(f => ({
			id: f.id,
			name: f.name,
			image: f.image,
			multiplier: price.get(f.id)!
		}));
		return fish.length ? [{ id, label, fish, best: Math.max(...fish.map(f => f.multiplier)) }] : [];
	});
}
