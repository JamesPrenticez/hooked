import type { Volatility } from "@type/api";

export interface VolatilityLevel {
	id: Volatility;
	label: string;
	/** What the small trigger button has room for. */
	short: string;
	/** How many chevrons the meter fills: how deep the hook tends to dive. */
	depth: 1 | 2 | 3;
	/** What the player is told the level does — no odds or multipliers; the server owns those (§37). */
	description: string;
}

/** The three levels, shallowest first. The server's `LEVELS` (`server/src/constants.ts`) holds what each one does. */
export const VOLATILITY_LEVELS: VolatilityLevel[] = [
	{
		id: "low",
		label: "Low",
		short: "Low",
		depth: 1,
		description: "The hook mostly stays in the shallows. Smaller swings, and a smaller jackpot."
	},
	{
		id: "medium",
		label: "Medium",
		short: "Med",
		depth: 2,
		description: "The hook dives to a mix of depths."
	},
	{
		id: "high",
		label: "High",
		short: "High",
		depth: 3,
		description: "The hook dives deep more often. Bigger swings, and the biggest jackpot."
	}
];

export const volatilityLevel = (id: Volatility): VolatilityLevel => VOLATILITY_LEVELS.find(level => level.id === id)!;
