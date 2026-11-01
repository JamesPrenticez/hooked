import monsterHunt from "@assets/bonuses/boss-hunter.webp";
import feedingFrenzy from "@assets/bonuses/feeding-frenzy.webp";
import luckyBait from "@assets/bonuses/lucky-bait.webp";
import reCast from "@assets/bonuses/re-cast.webp";

export interface BonusItem {
	id: string;
	title: string;
	image: string;
	/** CSS colour (a `--color-bonus-*` variable) used for the art's glow. */
	color: string;
	/** What the GDD says the card must disclose — no prices, odds, multipliers, RTP or max wins; none are committed. */
	description: string;
}

/** The bonus concepts in the GDD, in its order. Design proposals, not approved rules. */
export const BONUSES: BonusItem[] = [
	{
		id: "re-cast",
		title: "Re-Cast",
		image: reCast,
		color: "var(--color-bonus-recast)",
		description:
			"Junk or an escape on your first cast earns one more cast at the same bet and volatility, with no extra wager. The retry can lose too, and a landed fish isn't covered, even one worth less than your bet."
	},
	{
		id: "lucky-bait",
		title: "Lucky Bait",
		image: luckyBait,
		color: "var(--color-bonus-lucky)",
		description:
			"A one-round variant where successful catches can carry a multiplier. It doesn't guarantee a catch, stop a fish escaping or turn junk into a win."
	},
	{
		id: "feeding-frenzy",
		title: "Feeding Frenzy",
		image: feedingFrenzy,
		color: "var(--color-bonus-frenzy)",
		description:
			"Five automatic casts at your bet and volatility, with a running feature total. Each cast can land a fish, pull up junk or lose a fish, so it isn't five guaranteed wins."
	},
	{
		id: "monster-hunt",
		title: "Monster Hunt",
		image: monsterHunt,
		color: "var(--color-bonus-boss)",
		description:
			"One giant-creature encounter with a bespoke extraction sequence. Entry guarantees the encounter only, not the catch."
	}
];
