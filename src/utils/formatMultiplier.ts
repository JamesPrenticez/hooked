/** A multiplier as the market board and the landing readout write it: up to two decimals, as the server pays it, with
 *  trailing zeros dropped (`1.5`, `0.07`, `250`). The caller adds the ×. */
export function formatMultiplier(multiplier: number): string {
	return String(Number(multiplier.toFixed(2)));
}
