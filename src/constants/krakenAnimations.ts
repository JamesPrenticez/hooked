import animationData from "@assets/kraken/kraken-animations.json";

export interface KrakenAnimation {
	/** `sheet.name` — names repeat across sheets (`pull_release_regrab`), ids don't. */
	id: string;
	name: string;
	sheet: string;
	/** Cells on the sheet, numbered left to right, top to bottom. */
	frames: number[];
	fps: number;
	loop: boolean;
	description: string;
}

export interface KrakenSheet {
	id: string;
	label: string;
	columns: number;
	rows: number;
	animations: KrakenAnimation[];
}

/** The seven Kraken sheets, straight from `kraken-animations.json` — its fps
 *  and loop values are the manifest's suggestions, not playback-tested. */
export const KRAKEN_SHEETS: KrakenSheet[] = animationData.sheets.map(sheet => ({
	id: sheet.id,
	label: sheet.label,
	columns: sheet.logicalGrid.columns,
	rows: sheet.logicalGrid.rows,
	animations: sheet.animations.map(animation => ({
		id: animation.id,
		name: animation.name,
		sheet: sheet.id,
		frames: animation.frames,
		fps: animation.suggestedFps,
		loop: animation.suggestedLoop,
		description: animation.description
	}))
}));

export const KRAKEN_ANIMATIONS: Record<string, KrakenAnimation> = Object.fromEntries(
	KRAKEN_SHEETS.flatMap(sheet => sheet.animations.map(animation => [animation.id, animation]))
);

/** Where the encounter opens: the first beat of the manifest's suggested order. */
export const FIRST_KRAKEN_ANIMATION = animationData.suggestedEncounterOrder[0];

/** Sheet cell to draw `elapsed` seconds after `id` started. A loop wraps; a one-shot holds its last frame. */
export function krakenFrame(id: string, elapsed: number): number {
	const { frames, fps, loop } = KRAKEN_ANIMATIONS[id];
	const step = Math.max(0, Math.floor(elapsed * fps));
	return frames[loop ? step % frames.length : Math.min(step, frames.length - 1)];
}

/** The fight at the bottom of the trench: the Kraken grabs the hook, yanks it once, then keeps
 *  tugging — the last beat repeats until the fight ends. `repeat_tug` opens where `hard_yank`
 *  finishes and closes where it opens, so the loop has no seam. One sheet, so it loads once and
 *  never flickers between beats. */
export const KRAKEN_FIGHT = [
	"coiled_yanks_full_body.double_wrap",
	"coiled_yanks_full_body.hard_yank",
	"coiled_yanks_full_body.repeat_tug"
];

/** How long the Kraken fights the hook — the hook holds at the bottom of the trench that long. */
export const KRAKEN_FIGHT_SECONDS = 8;

/** Then it swims back and forth across the trench, the hook in its beak, for this long. */
export const KRAKEN_SWIM = "swimming_full_body.jet_swim";
export const KRAKEN_SWIM_SECONDS = 6;
/** Then it hangs from the hook by its beak, struggling, for this long before the camera leaves. */
export const KRAKEN_HOOKED_SECONDS = 2.5;
/** What it does while it is landed, hanging from the hook by its beak. */
export const KRAKEN_HANG = "swimming_full_body.cruise";

const seconds = (id: string) => KRAKEN_ANIMATIONS[id].frames.length / KRAKEN_ANIMATIONS[id].fps;

/** The fight beat playing `elapsed` seconds in, and how far into that beat we are. */
export function krakenFightBeat(elapsed: number): {
	id: string;
	elapsed: number;
} {
	let start = 0;
	for (const id of KRAKEN_FIGHT.slice(0, -1)) {
		if (elapsed < start + seconds(id)) return { id, elapsed: elapsed - start };
		start += seconds(id);
	}
	const last = KRAKEN_FIGHT[KRAKEN_FIGHT.length - 1];
	return { id: last, elapsed: (elapsed - start) % seconds(last) };
}
