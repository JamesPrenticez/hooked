export interface SheetAnimation {
	row: number;
	fps: number;
	frameCount: number;
}

/** Index of the frame showing `seconds` into a looping animation. */
export function frameIndex(seconds: number, { fps, frameCount }: SheetAnimation): number {
	return Math.floor(seconds * fps) % frameCount;
}

/** Pixel rect of one cell in an evenly-gridded sheet. Derived from the loaded
 *  texture's real size — exports don't always match the size `animations.json`
 *  states (mackerel is 1774×887, not the listed 4096×2048). */
export function cellRect(
	sheet: { width: number; height: number },
	cols: number,
	rows: number,
	row: number,
	col: number
) {
	const width = sheet.width / cols;
	const height = sheet.height / rows;
	return { x: col * width, y: row * height, width, height };
}
