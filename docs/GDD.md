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

- SHALLOW
  - 🐟 Minnow
  - 🐠 Sardine
  - 🐡 Snapper
- REEF
  - 🐠 Grouper
  - 🐡 Puffer
  - 🐟 Barracuda

- DEEP
  - 🦈 Shark
  - 🐋 Tuna
  - 🐟 Marlin

- ABYSS
  - 🦑 Giant Squid
  - 🐋 Giant Whale

- TRENCH
  - 👹 Sea Monster

# Math

The underlying mathematics share characteristics with stepper games, Mines, Dice and other probability-based instant/burst games, while the presentation layer draws inspiration from fishing and game-show mechanics.
