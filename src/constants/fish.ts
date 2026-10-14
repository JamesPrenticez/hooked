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
	/** One still portrait for the selection modal. */
	image?: string;
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

// One 8-column sheet per species (all face left). Shrimp, king crab, starfish have no sheet of their own yet and borrow one.
const BARRACUDA = sheet(new URL("../assets/fish-sprites/barracuda.png", import.meta.url).href);
const CLOWN = sheet(new URL("../assets/fish-sprites/clown.png", import.meta.url).href);
const COD = sheet(new URL("../assets/fish-sprites/cod.png", import.meta.url).href);
const DRAGON = sheet(new URL("../assets/fish-sprites/dragon.png", import.meta.url).href);
const GROUPER = sheet(new URL("../assets/fish-sprites/grouper.png", import.meta.url).href);
const SHRIMP = sheet(new URL("../assets/fish-sprites/shrimp.png", import.meta.url).href);
const GUPPY = sheet(new URL("../assets/fish-sprites/guppy.png", import.meta.url).href);
const LANTERN = sheet(new URL("../assets/fish-sprites/lantern.png", import.meta.url).href);
const MARLIN = sheet(new URL("../assets/fish-sprites/marlin.png", import.meta.url).href);
const PUFFER = sheet(new URL("../assets/fish-sprites/puffer.png", import.meta.url).href);
const SARDINE = sheet(new URL("../assets/fish-sprites/sardine.png", import.meta.url).href);
const SHARK = sheet(new URL("../assets/fish-sprites/shark.png", import.meta.url).href);
const SNAPPER = sheet(new URL("../assets/fish-sprites/snapper.png", import.meta.url).href);
const SQUID = sheet(new URL("../assets/fish-sprites/squid.png", import.meta.url).href);
const STING = sheet(new URL("../assets/fish-sprites/sting.png", import.meta.url).href);
const TREVALLY = sheet(new URL("../assets/fish-sprites/trevally.png", import.meta.url).href);
const TUNA = sheet(new URL("../assets/fish-sprites/tuna.png", import.meta.url).href);
const NAPOLEON = sheet(new URL("../assets/fish-sprites/napoleon.png", import.meta.url).href, { opaque: true });
const TURTLE = sheet(new URL("../assets/fish-sprites/turtle.png", import.meta.url).href, { fps: 8 });
const JELLY = sheet(new URL("../assets/fish-sprites/jelly.png", import.meta.url).href, { fps: 8 });
const WHALE = sheet(new URL("../assets/fish-sprites/sperm.png", import.meta.url).href, { fps: 8 });

const portrait = (name: string) => new URL(`../assets/single-fish/${name}.png`, import.meta.url).href;

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
	count: number,
	image?: string
): HookableFish => ({ id, name, depth, art, scale, speed, fromMeters, toMeters, count, mouth: MOUTH, image });

/** Bettable fish. Ids must match the server roster (`server/src/constants.ts` FISH) — that's what `validateBets`
 *  accepts. Order is the sim's spawn order, so changing it changes every seeded world (bump `SIM_VERSION`). Bands
 *  follow the zones, except the lanternfish and whale, which live down in the trench (9,785m+) — capped at 10,825m
 *  (the whale, being huge, at 10,675m) so the Kraken keeps the jackpot layer (10,935m+). */
export const FISH: (FishEntry | HookableFish)[] = [
	// shallow
	fish("shrimp", "Shrimp", "shallow", SHRIMP, 0.55, 35, 110, 1420, 5, portrait("shrimp")),
	fish("sardine", "Sardine", "shallow", SARDINE, 0.7, 90, 165, 1530, 6, portrait("sardine")),
	fish("blue-cod", "Blue Cod", "shallow", COD, 0.7, 70, 300, 1400, 3, portrait("cod")),
	fish("barracuda", "Barracuda", "shallow", BARRACUDA, 0.9, 130, 490, 2570, 4, portrait("barracuda")),
	fish("guppy", "Guppy", "shallow", GUPPY, 0.5, 60, 165, 1530, 5, portrait("guppy")),
	fish("clown", "Clownfish", "shallow", CLOWN, 0.55, 50, 110, 1420, 4, portrait("clown")),
	// reef
	fish("napoleon", "Napoleon Wrasse", "reef", NAPOLEON, 0.8, 55, 1530, 3610, 5, portrait("napoleon")),
	fish("turtle", "Turtle", "reef", TURTLE, 0.85, 40, 1640, 4045, 4, portrait("turtle")),
	fish("king-crab", "King Crab", "reef", GROUPER, 0.5, 40, 1640, 4045, 4),
	fish("snapper", "Snapper", "reef", SNAPPER, 0.8, 60, 1530, 3610, 4, portrait("snapper")),
	fish("grouper", "Grouper", "reef", GROUPER, 0.9, 45, 1640, 4045, 3, portrait("grouper")),
	fish("trevelly", "Trevally", "reef", TREVALLY, 0.9, 120, 1530, 3935, 4, portrait("trevelly")),
	// deep
	fish("sting-ray", "Sting Ray", "deep", STING, 1.2, 60, 4100, 7000, 4, portrait("sting")),
	fish("bluefin-tuna", "Bluefin Tuna", "deep", TUNA, 1, 140, 4100, 7110, 5, portrait("tuna")),
	fish("puffer", "Pufferfish", "deep", PUFFER, 0.7, 45, 4210, 7110, 4, portrait("puffer")),
	fish("shark", "Shark", "deep", SHARK, 2.3, 100, 4430, 7215, 3, portrait("shark")),
	fish("barracuda-epic", "Barracuda", "deep", BARRACUDA, 0.9, 120, 4100, 7000, 2, portrait("barracuda")),
	fish("swordfish", "Swordfish", "deep", MARLIN, 1.3, 150, 4100, 7110, 3, portrait("marlin")),
	fish("sting", "Stingray", "deep", STING, 0.9, 50, 4100, 7000, 3, portrait("sting")),
	// abyss
	fish("lanternfish", "Lanternfish", "abyss", LANTERN, 0.75, 45, 9895, 10_825, 5, portrait("lantern")),
	fish("jellyfish", "Jellyfish", "abyss", JELLY, 0.6, 20, 7215, 9675, 6, portrait("jellly")),
	fish("starfish", "Starfish", "abyss", JELLY, 0.5, 25, 7215, 9675, 3),
	fish("whale", "Whale", "abyss", WHALE, 4.5, 30, 10_005, 10_675, 2, portrait("sperm")),
	fish("squid", "Squid", "abyss", SQUID, 0.8, 40, 7215, 9675, 4, portrait("squid")),
	fish("dragon", "Sea Dragon", "abyss", DRAGON, 0.9, 50, 7215, 9675, 3, portrait("dragon")),
	// jackpot
	{ id: "kraken", name: "Kraken", depth: "jackpot", image: portrait("kraken") }
];

const isHookable = (f: FishEntry | HookableFish): f is HookableFish => "art" in f;

/** The fish that swim in the world, in spawn order. */
export const HOOKABLE_FISH: HookableFish[] = FISH.filter(isHookable);

export const HOOKABLE_BY_ID: ReadonlyMap<string, HookableFish> = new Map(HOOKABLE_FISH.map(f => [f.id, f]));

/** Each distinct spritesheet once. */
export const SHEETS: Sheet[] = [...new Set(HOOKABLE_FISH.map(f => f.art))];
