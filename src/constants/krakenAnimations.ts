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
