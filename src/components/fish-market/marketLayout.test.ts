import { expect, it } from "vitest";

import { FISH } from "@constants/fish";
import type { MarketEntry } from "@type/api";

import { dealMs, DROP_MS, FIRST_DROP_MS, marketZones, STAGGER_MS } from "./marketLayout";

const market: MarketEntry[] = FISH.map((f, i) => ({ fish: f.id, multiplier: (0.1 + i * 0.5).toFixed(2) }));

it("groups the market by depth zone, shallowest first, with the Kraken's jackpot last", () => {
	const zones = marketZones(market);
	expect(zones.map(z => z.id)).toEqual(["shallow", "reef", "deep", "abyss", "jackpot"]);
	expect(zones.map(z => z.label)).toEqual(["Shallow", "Reef", "Deep", "Abyss", "Jackpot"]);
	expect(zones.at(-1)!.fish.map(f => f.id)).toEqual(["kraken"]);
});

it("lists every fish once, in roster order, so a fish keeps its place and only its price changes", () => {
	const zones = marketZones(market);
	expect(zones.flatMap(z => z.fish.map(f => f.id))).toEqual(FISH.map(f => f.id));

	const reversed = marketZones([...market].reverse().map((e, i) => ({ ...e, multiplier: String(i + 1) })));
	expect(reversed.flatMap(z => z.fish.map(f => f.id))).toEqual(FISH.map(f => f.id));
});

it("carries each fish's price as a number, and the dearest price in its zone", () => {
	const [shallow] = marketZones(market);
	expect(shallow.fish[0].multiplier).toBe(0.1);
	expect(shallow.best).toBe(Math.max(...shallow.fish.map(f => f.multiplier)));
});

it("leaves off a fish the market does not price, and a zone with none of its fish", () => {
	const onlyShallow = market.filter(e => FISH.find(f => f.id === e.fish)!.depth === "shallow");
	expect(marketZones(onlyShallow).map(z => z.id)).toEqual(["shallow"]);
	expect(marketZones([])).toEqual([]);
});

it("deals a longer market out over more time, one chip after another", () => {
	expect(dealMs(1)).toBe(FIRST_DROP_MS + DROP_MS);
	expect(dealMs(26)).toBe(FIRST_DROP_MS + 25 * STAGGER_MS + DROP_MS);
	expect(dealMs(0)).toBe(dealMs(1));
});
