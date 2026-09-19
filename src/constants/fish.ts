import type { DepthId } from "@type/api";

export interface FishEntry {
	id: string;
	name: string;
	depth: DepthId;
}

/** Bettable fish, in depth order. Ids must match the server roster
 *  (`server/src/constants.ts` FISH) — that's what `validateBets` accepts. */
export const FISH: FishEntry[] = [
	{ id: "shrimp", name: "Shrimp", depth: "shallow" },
	{ id: "sardine", name: "Sardine", depth: "shallow" },
	{ id: "blue-cod", name: "Blue Cod", depth: "shallow" },
	{ id: "barracuda", name: "Barracuda", depth: "shallow" },
	{ id: "napoleon", name: "Napoleon Wrasse", depth: "reef" },
	{ id: "turtle", name: "Turtle", depth: "reef" },
	{ id: "swordfish", name: "Swordfish", depth: "reef" },
	{ id: "king-crab", name: "King Crab", depth: "reef" },
	{ id: "manta-ray", name: "Manta Ray", depth: "deep" },
	{ id: "bluefin-tuna", name: "Bluefin Tuna", depth: "deep" },
	{ id: "shark", name: "Shark", depth: "deep" },
	{ id: "barracuda-epic", name: "Barracuda", depth: "deep" },
	{ id: "puffer", name: "Pufferfish", depth: "deep" },
	{ id: "lanternfish", name: "Lanternfish", depth: "abyss" },
	{ id: "jellyfish", name: "Jellyfish", depth: "abyss" },
	{ id: "starfish", name: "Starfish", depth: "abyss" },
	{ id: "whale", name: "Whale", depth: "abyss" },
	{ id: "kraken", name: "Kraken", depth: "jackpot" }
];
