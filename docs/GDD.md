# 🎣 HOOKED - Game Design Document

_Pick your target. Drop the hook. Discover how big your catch really is._

# Overview

**Genre:** Burst Game - Target Selection

**Game Flow:**

1. **Place Your Bets**
   - The player is presented with a betting board where they have the option to select a `depth range` or a `individual fish species` or `both` - similar to roulettes `1st/2nd/3rds/red/black` or `1-36`.
   - A player might choose a conservative bet on `shallow`, while also placing a smaller high-risk bet on `shark`. Once bets are confirmed, the outcome is locked in pre-determinic fashion.
2. **Cast the line / Drop the hook**
   - The fishing line is cast and the hook begins its descent. The player watches as it travels through increasingly deep underwater environments, passing schools of fish, obstacles and environmental events. `The journey is fully automated`, but designed to create the feeling that the hook is actively navigating toward the player's chosen targets.
3. **The Encounter**
   - As the hook reaches the seeds pre-determined depth, the target fish appears. The pace slows. The fish approaches. The hook strikes. The line goes tight. **HOOKED!!!**. The Fish pulls. The Camera shakes.
4. **The Accent Back to the Surface**
   - The camera rapidly follows the line back to the surface (potentially the camera looks upwards toward the surface first). Camera splashes out of the water and the player is watching the fisherman struggling with his rod/boat. We don't immediately show the fish.
5. **The Extraction**
   - The fisherman attempts to retrieve the catch. Depending on the `size/multipler` of the outcome, increasingly powerful equipment is deployed:
     - **Small** = rod
     - **Medium** = winch
     - **Large** = crane
     - **Huge** = helicopter (similar to _Ice Fishing_)
   - The player now discovers exactly how large the catch really is.
6. **Payout Screen**

---

# The Player Experience

The game is deliberately structured around two suspense moments:

1. "Will I catch what I bet on?"

followed by:

2. "How big will it be?"

This creates a continuous narrative from bet placement through to payout, rather than presenting the player with a single instantaneous result.

# 🎨 Theme

"The world's busiest fishing harbour."

`Busy Asian fishing harbour → underwater coastal waters → reef → deep ocean → abyss → trench → jackpot`

A fictional harbour inspired by East Asian commercial fishing ports.

That gives us the freedom to borrow visual elements from:

🇯🇵 Japan
🇨🇳 China
🇰🇷 South Korea
🇹🇼 Taiwan
🇭🇰 Hong Kong

without tying the entire game to one specific country.

Hooked is set in a bustling, fictional Asian fishing harbour inspired by the world's major commercial fishing ports.

The harbour is a living industrial environment filled with fishing vessels, dock workers, cranes, winches, markets and heavy machinery. Players are one of many fishermen competing to land increasingly valuable and spectacular catches.

The underwater world extends directly beneath the harbour, progressing from busy coastal waters and reefs into deeper offshore waters and ultimately the mysterious ocean abyss.

The environment provides a natural progression for the game's extraction mechanic. Small catches can be handled by hand, while increasingly enormous catches require progressively more powerful equipment — from fishing rods and winches to cranes, heavy machinery and helicopters.

The harbour should feel busy, competitive and constantly in motion, creating the impression that the player is part of a much larger fishing industry.

The overall tone is cinematic, energetic and slightly exaggerated, allowing the game to transition naturally from authentic fishing operations into spectacular, larger-than-life extraction sequences.

There's one particularly cool design opportunity: the harbour itself could be our persistent "hub" screen, with the betting board integrated into the environment, while the underwater world is essentially the second half of the same scene. That would give the whole game a much stronger identity than the typical menu → spin → animation → win casino flow.

# The Betting Table

```json
export const FISH_GUIDE: FishGuideEntry[] = [
	// Shallow — common / low-value catches
	{ id: "shrimp", name: "Shrimp", depth: "shallow", tierId: "junk", image: FISH.shrimp },
	{ id: "sardine", name: "Sardine", depth: "shallow", tierId: "small", image: FISH.sardine },
	{ id: "blue-cod", name: "Blue Cod", depth: "shallow", tierId: "small", image: FISH.blueCod },
	{ id: "barracuda", name: "Barracuda", depth: "shallow", tierId: "small", image: FISH.barracuda },

	// Reef — medium / valuable catches
	{ id: "napoleon", name: "Napoleon Wrasse", depth: "reef", tierId: "medium", image: FISH.napoleon },
	{ id: "turtle", name: "Turtle", depth: "reef", tierId: "medium", image: FISH.turtle },
	{ id: "swordfish", name: "Swordfish", depth: "reef", tierId: "large", image: FISH.swordfish },
	{ id: "king-crab", name: "King Crab", depth: "reef", tierId: "large", image: FISH.kingCrab },

	// Deep — rare / high-value catches
	{ id: "manta-ray", name: "Manta Ray", depth: "deep", tierId: "rare", image: FISH.mantaRay },
	{ id: "bluefin-tuna", name: "Bluefin Tuna", depth: "deep", tierId: "rare", image: FISH.blueTuna, wide: true },
	{ id: "shark", name: "Shark", depth: "deep", tierId: "epic", image: FISH.shark, wide: true },
	{ id: "barracuda-epic", name: "Barracuda", depth: "deep", tierId: "epic", image: FISH.barracudaEpic },
	{ id: "puffer", name: "Pufferfish", depth: "deep", tierId: "epic", image: FISH.puffer },

	// Abyss — legendary / jackpot catches
	{ id: "lanternfish", name: "Lanternfish", depth: "abyss", tierId: "legendary", image: FISH.lanternfish },
	{ id: "jellyfish", name: "Jellyfish", depth: "abyss", tierId: "legendary", image: FISH.jellyfish },
	{ id: "starfish", name: "Starfish", depth: "abyss", tierId: "legendary", image: FISH.starfish },
	{ id: "whale", name: "Whale", depth: "abyss", tierId: "jackpot", image: FISH.whale, wide: true },

	// Jackpot — ultra-rare / ultimate catch
	{ id: "kraken", name: "Kraken", depth: "jackpot", tierId: "jackpot", image: FISH.kraken, wide: true },
];
```

# Mathematical Model & RTP

`Hooked` uses a single predetermined outcome per round, with players able to distribute their wager across different depth zones and individual fish. Depth bets provide broader coverage and higher hit frequency, while specific fish bets offer lower probability and higher potential payouts. Players can combine multiple bets to create their preferred risk profile — for example, placing a larger bet on Shallow as a safer cover while placing a smaller bet on Shark for greater upside.

The game will target a 96% theoretical RTP, meaning that over a very large number of rounds, approximately $96 of every $100 wagered is expected to be returned to players, with the remaining 4% representing the theoretical house edge. Individual rounds and player sessions can vary significantly due to the game's volatility.

The underlying outcome is generated once per round and all active bets are evaluated against that result. A specific fish also belongs to a depth zone, meaning a player can potentially win both a broad depth bet and a specific fish bet when the outcome matches both selections. The probability and payout of each selection will be balanced to maintain the target RTP while allowing players to choose between safer, more frequent catches and high-risk, high-value targets.
