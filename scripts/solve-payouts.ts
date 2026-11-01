// Prints what each volatility's payout table actually does: its RTP (bonus included) and how many rounds land each
// piece of extraction gear. Exact — it walks every price × bonus, no simulation. Re-run after changing LEVELS,
// the BONUS_* constants or the gear thresholds in simExtraction.ts:
//   pnpm solve:payouts

import { BONUS_MULTIPLIERS, BONUS_ODDS, DEPTHS, FISH, LEVELS, RTP, VOLATILITIES } from "../server/src/constants.ts";
import { ESCAPE, PRICES } from "../server/src/market.ts";
import { gearsFor } from "../src/utils/simExtraction.ts";

const weightSum = BONUS_MULTIPLIERS.reduce((sum, b) => sum + b.weight, 0);
const bonuses = [
	{ value: 1, chance: 1 - 1 / BONUS_ODDS },
	...BONUS_MULTIPLIERS.map(b => ({ value: b.value, chance: b.weight / weightSum / BONUS_ODDS }))
];

const pct = (n: number) => `${(n * 100).toFixed(2)}%`.padStart(7);

console.log(
	`target RTP ${pct(RTP).trim()}   bonus 1 in ${BONUS_ODDS}: ${BONUS_MULTIPLIERS.map(b => `x${b.value}`).join(" ")}\n`
);
console.log("volatility    RTP    rod   crane    heli  chinook  | >= crane | escape");

for (const v of VOLATILITIES) {
	const { odds } = LEVELS[v];
	const escape = ESCAPE[v];
	const total = DEPTHS.reduce((sum, d) => sum + odds[d], 0);
	const gear = [0, 0, 0, 0];
	let rtp = 0;
	for (const d of DEPTHS) {
		const fish = FISH.filter(f => f.depth === d).length;
		const landed = (odds[d] / total) * (d === "jackpot" ? 1 : 1 - escape);
		if (d !== "jackpot") gear[0] += (odds[d] / total) * escape; // an escaped fish pays nothing: the rod
		for (const price of PRICES[v][d]) {
			for (const b of bonuses) {
				const chance = (landed / fish) * b.chance;
				rtp += chance * price * b.value;
				gear[gearsFor(price * b.value).length - 1] += chance;
			}
		}
	}
	const [rod, crane, heli, chinook] = gear;
	console.log(
		`${v.padEnd(10)} ${pct(rtp)} ${pct(rod)} ${pct(crane)} ${pct(heli)} ${pct(chinook)}  | ${pct(crane + heli + chinook)} | ${pct(escape)}`
	);
}
