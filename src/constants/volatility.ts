import cardLow from "@assets/volatility/card-easy.webp";
import cardExtreme from "@assets/volatility/card-extreme.webp";
import cardHigh from "@assets/volatility/card-high.webp";
import cardMedium from "@assets/volatility/card-medium.webp";
import iconLow from "@assets/volatility/icon-easy.svg";
import iconExtreme from "@assets/volatility/icon-extreme.svg";
import iconHigh from "@assets/volatility/icon-high.svg";
import iconMedium from "@assets/volatility/icon-medium.svg";
import type { Volatility } from "@type/api";

export interface VolatilityLevel {
	id: Volatility;
	label: string;
	/** Raw hex: it is baked into the card's SVG border, where a CSS variable can't resolve. */
	color: string;
	/** Small badge for the trigger button and the card. */
	icon: string;
	/** Card art in the modal. */
	image: string;
	/** What the player is told the level does — no odds or multipliers; the server owns those (§37). */
	description: string;
}

/** The three levels, shallowest first. The server's `LEVELS` (`server/src/constants.ts`) holds what each one does. */
export const VOLATILITY_LEVELS: VolatilityLevel[] = [
	{
		id: "low",
		label: "Low",
		color: "#67D82E",
		icon: iconLow,
		image: cardLow,
		description: "The hook mostly stays in the shallows. Smaller swings, and a smaller jackpot."
	},
	{
		id: "medium",
		label: "Medium",
		color: "#FF8A2B",
		icon: iconMedium,
		image: cardMedium,
		description: "The hook dives to a mix of depths."
	},
	{
		id: "high",
		label: "High",
		color: "#8B4DFF",
		icon: iconHigh,
		image: cardHigh,
		description: "The hook dives deep more often. Bigger swings, and a bigger jackpot."
	},
	{
		id: "extreme",
		label: "Extreme",
		color: "#FF3B3B",
		icon: iconExtreme,
		image: cardExtreme,
		description: "The hook almost never leaves the shallows, but when it dives deep it pays the biggest jackpot."
	}
];

export const volatilityLevel = (id: Volatility): VolatilityLevel => VOLATILITY_LEVELS.find(level => level.id === id)!;
