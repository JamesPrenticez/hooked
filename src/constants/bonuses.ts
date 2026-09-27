import monsterHunt from "@assets/bonuses/boss-hunter.png";
import feedingFrenzy from "@assets/bonuses/feeding-frenzy.png";
import luckyBait from "@assets/bonuses/lucky-bait.png";
import reCast from "@assets/bonuses/re-cast.png";

export interface BonusItem {
	id: string;
	title: string;
	image: string;
	/** What the GDD says the card must disclose — no prices, odds, multipliers, RTP or max wins; none are committed. */
	description: string;
}

/** The bonus concepts in the GDD, in its order. Design proposals, not approved rules. */
export const BONUSES: BonusItem[] = [
	{
		id: "re-cast",
		title: "Re-Cast",
		image: reCast,
		description:
			"Junk or an escape on your first cast earns one more cast on the same targets, with no extra wager. The retry can lose too, and a landed fish that misses your bet isn't covered."
	},
	{
		id: "lucky-bait",
		title: "Lucky Bait",
		image: luckyBait,
		description:
			"A one-round variant where successful catches can carry a multiplier. It doesn't guarantee a catch, stop a fish escaping or turn junk into a win."
	},
	{
		id: "feeding-frenzy",
		title: "Feeding Frenzy",
		image: feedingFrenzy,
		description:
			"Five automatic casts on your chosen targets, with a running feature total. Each cast can land a fish, pull up junk or lose a fish, so it isn't five guaranteed wins."
	},
	{
		id: "monster-hunt",
		title: "Monster Hunt",
		image: monsterHunt,
		description:
			"One giant-creature encounter with a bespoke extraction sequence. Entry guarantees the encounter only, not the catch."
	}
];
