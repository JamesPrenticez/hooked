import type { SheetAnimation } from "@components/descent-scene/spriteSheet";
import type { DepthId } from "@type/api";

// The sim (`utils/sim*.ts`) reads this file and runs under plain Node on the server, so: no runtime
// imports, and sheet URLs are `new URL(literal, import.meta.url)` — Vite swaps in the hashed asset
// URL, Node just gets an unused file: string.

/** A mouth's contact circle as fractions of the sprite cell, from its centre, for left-facing art. */
export interface Mouth {
	/** Of cell width. */
	x: number;
	/** Of cell height. */
	y: number;
	/** Of cell width. */
	r: number;
}

/** One spritesheet: a grid of `cols` × 4 rows (swim, bite, struggle — see `spriteSheet.ts`). */
export interface Sheet {
	url: string;
	/** Cells per row — the export's real grid, not the tile size in `animations.json`. */
	cols: number;
	/** One sprite cell, px, before `scale`. */
	cellW: number;
	cellH: number;
	/** Swim row: row 1 on every sheet, one frame per column. */
	swim: SheetAnimation;
	/** RGB PNG on solid black (no alpha) — drawn with a screen blend so the black drops out. */
	opaque?: boolean;
}

/** Every fish you can bet on. */
export interface FishEntry {
	id: string;
	name: string;
	depth: DepthId;
}

/** A fish that swims in the world and can be hooked (the Kraken is reeled in at the bottom instead). */
export interface HookableFish extends FishEntry {
	art: Sheet;
	scale: number;
	/** Cruise speed, sim px/s. */
	speed: number;
	/** Depth band the fish are spread through, in metres. */
	fromMeters: number;
	toMeters: number;
	/** How many of this fish live in the world. */
	count: number;
	mouth: Mouth;
}

const S = 221.75; // the common 1774×887 sheet: 8 cols × 4 rows

const sheet = (
	url: string,
	{
		cols = 8,
		fps = 10,
		opaque,
		cell = [S, S]
	}: { cols?: number; fps?: number; opaque?: true; cell?: [number, number] } = {}
): Sheet => ({
	url,
	cols,
	cellW: cell[0],
	cellH: cell[1],
	swim: { row: 1, fps, frameCount: cols },
	opaque
});

// Sheets are shared: blue-cod, barracuda-epic and starfish have no art yet and borrow a nearby one. All face left.
const SHRIMP = sheet(new URL("../assets/creatures/shrimp.png", import.meta.url).href, { opaque: true });
const MACKEREL = sheet(new URL("../assets/creatures/mackeral.png", import.meta.url).href);
const BARRACUDA = sheet(new URL("../assets/creatures/barracuda.png", import.meta.url).href, { opaque: true });
const NAPOLEON = sheet(new URL("../assets/creatures/neoplean.png", import.meta.url).href, { opaque: true });
const TURTLE = sheet(new URL("../assets/creatures/turtle.png", import.meta.url).href, { opaque: true, fps: 8 });
const PIKE = sheet(new URL("../assets/creatures/pike.png", import.meta.url).href, { opaque: true });
const CRAB = sheet(new URL("../assets/creatures/crab.png", import.meta.url).href, { cell: [512, 512] });
const MANTA = sheet(new URL("../assets/creatures/manta ray.png", import.meta.url).href, {
	opaque: true,
	cols: 9,
	fps: 8,
	cell: [185.78, 235.25]
});
const TUNA = sheet(new URL("../assets/creatures/tuna.png", import.meta.url).href);
const PUFFER = sheet(new URL("../assets/creatures/puffer.png", import.meta.url).href);
const SHARK = sheet(new URL("../assets/creatures/shark.png", import.meta.url).href, { opaque: true });
const LANTERN = sheet(new URL("../assets/creatures/lantern.png", import.meta.url).href, {
	opaque: true,
	cell: [244, 201.5]
});
const JELLY = sheet(new URL("../assets/creatures/jelly.png", import.meta.url).href, { opaque: true, fps: 8 });
const WHALE = sheet(new URL("../assets/creatures/whale.png", import.meta.url).href, {
	opaque: true,
	cols: 6,
	fps: 8,
	cell: [269.83, 242.75]
});

/** Seed for every fish until the hit-box overlay says otherwise. */
const MOUTH: Mouth = { x: -0.4, y: 0.05, r: 0.12 };

const fish = (
	id: string,
	name: string,
	depth: DepthId,
	art: Sheet,
	scale: number,
	speed: number,
	fromMeters: number,
	toMeters: number,
	count: number
): HookableFish => ({ id, name, depth, art, scale, speed, fromMeters, toMeters, count, mouth: MOUTH });

/** Bettable fish. Ids must match the server roster (`server/src/constants.ts` FISH) — that's what `validateBets`
 *  accepts. Order is the sim's spawn order, so changing it changes every seeded world (bump `SIM_VERSION`). Bands
 *  follow the zones, except the lanternfish and whale, which live down in the trench (9,785m+) — capped at 10,825m
 *  (the whale, being huge, at 10,675m) so the Kraken keeps the jackpot layer (10,935m+). */
export const FISH: (FishEntry | HookableFish)[] = [
	// shallow
	fish("shrimp", "Shrimp", "shallow", SHRIMP, 0.55, 35, 110, 1420, 5),
	fish("sardine", "Sardine", "shallow", MACKEREL, 0.7, 90, 165, 1530, 6),
	fish("blue-cod", "Blue Cod", "shallow", MACKEREL, 0.7, 70, 300, 1400, 3),
	fish("barracuda", "Barracuda", "shallow", BARRACUDA, 0.9, 130, 490, 2570, 4),
	// reef
	fish("napoleon", "Napoleon Wrasse", "reef", NAPOLEON, 0.8, 55, 1530, 3610, 5),
	fish("turtle", "Turtle", "reef", TURTLE, 0.85, 40, 1640, 4045, 4),
	fish("swordfish", "Swordfish", "reef", PIKE, 0.9, 110, 1530, 3935, 4),
	fish("king-crab", "King Crab", "reef", CRAB, 0.5, 40, 1640, 4045, 4),
	// deep
	fish("manta-ray", "Manta Ray", "deep", MANTA, 1.2, 60, 4100, 7000, 4),
	fish("bluefin-tuna", "Bluefin Tuna", "deep", TUNA, 1, 140, 4100, 7110, 5),
	fish("puffer", "Pufferfish", "deep", PUFFER, 0.7, 45, 4210, 7110, 4),
	fish("shark", "Shark", "deep", SHARK, 2.3, 100, 4430, 7215, 3),
	fish("barracuda-epic", "Barracuda", "deep", BARRACUDA, 0.9, 120, 4100, 7000, 2),
	// abyss
	fish("lanternfish", "Lanternfish", "abyss", LANTERN, 0.75, 45, 9895, 10_825, 5),
	fish("jellyfish", "Jellyfish", "abyss", JELLY, 0.6, 20, 7215, 9675, 6),
	fish("starfish", "Starfish", "abyss", CRAB, 0.5, 25, 7215, 9675, 3),
	fish("whale", "Whale", "abyss", WHALE, 4.5, 30, 10_005, 10_675, 2),
	// jackpot
	{ id: "kraken", name: "Kraken", depth: "jackpot" }
];

const isHookable = (f: FishEntry | HookableFish): f is HookableFish => "art" in f;

/** The fish that swim in the world, in spawn order. */
export const HOOKABLE_FISH: HookableFish[] = FISH.filter(isHookable);

export const HOOKABLE_BY_ID: ReadonlyMap<string, HookableFish> = new Map(HOOKABLE_FISH.map(f => [f.id, f]));

/** Each distinct spritesheet once. */
export const SHEETS: Sheet[] = [...new Set(HOOKABLE_FISH.map(f => f.art))];
