# 🎣 HOOKED - Game Design Document

_Read the market. Pick your water. Discover what you've hooked._

# Overview

**Genre:** Burst Game - Fishing Market

You never choose a fish. You choose **how much to bet** and **how deep the hook is likely to dive** (the _volatility_). The fish do the rest: every round the harbour's **fish market** posts a fresh price for every fish, the hook goes down, and whatever it lands pays **your bet × that fish's price**.

**Game Flow:**

1. **Set Your Bet**
   - The player sets a **bet** (the stake) and a **volatility** (Low / Medium / High). That is all there is to choose - there is no depth or species to pick.
   - Volatility is how likely the hook is to dive into the deep. It is explained in [Volatility](#volatility).
2. **Cast the line / The market is posted**
   - Pressing Cast takes the bet and, in the same moment, the server rolls the round: the **market** (what every fish pays this round) and **the catch** (which fish the hook will land). Both are decided before anything is shown.
   - A **pop-up** deals the new market onto a board: every fish drops into place with its price. Then it shrinks onto the **fish market board on the docks** and the hook goes down. A tap skips the wait.
3. **The Descent**
   - The hook travels through increasingly deep underwater environments, passing schools of fish. The journey is automated, but it is built to look like the hook is _hunting_ one particular fish - because it is: it steers for the fish the server chose, and only that fish will take it.
4. **The Encounter**
   - The hook reaches the fish. The pace slows. The fish takes the hook. **HOOKED!!!** The fish pulls. The camera shakes. The splash names the fish. The board is hidden while the hook is down, so the player has to remember what it pays.
5. **The Ascent Back to the Surface**
   - The camera rapidly follows the line back to the surface and splashes out of the water. The fisherman struggles with his rod. We don't show the full fish yet.
6. **The Extraction**
   - The fisherman retrieves the catch, and the heavier the payout, the bigger the machinery:
     - **Small** = rod
     - **Medium** = crane
     - **Large** = helicopter
     - **Huge** = Chinook (tandem-rotor helicopter, similar to _Ice Fishing_)
   - A multiplier counts up as the fish comes out of the water and the payout counts with it.
7. **Payout**
   - The server's payout is credited. The board on the dock keeps the round's prices with the catch ringed, until the next cast posts a new market.

---

# The Player Experience

The game is deliberately structured around two suspense moments:

1. "How deep will it go - and what will it take?"

followed by:

2. "What was that worth, and how much machinery will it take to land?"

The market makes the second question _answerable_ rather than a secret: the prices are posted before the hook goes down. The suspense moves from "will I get a big one?" to "will the fish I'm watching be the one the hook finds, and did I remember what it pays?". The landing still builds, gear by gear, and the final multiplier still counts up - the player just has a good idea where it is heading.

A catch can be **worth less than the bet**. When it is, the fisherman looks let down instead of cheering and the payout shows less than the stake from the first moment of the landing - there is nothing to count up to. That is a loss, shown honestly.

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

The environment provides a natural progression for the game's extraction mechanic. Small catches can be handled by hand, while increasingly enormous catches require progressively more powerful equipment - from fishing rods and cranes to helicopters.

The harbour should feel busy, competitive and constantly in motion, creating the impression that the player is part of a much larger fishing industry.

The overall tone is cinematic, energetic and slightly exaggerated, allowing the game to transition naturally from authentic fishing operations into spectacular, larger-than-life extraction sequences.

The harbour itself is the persistent "hub" screen, with the **fish market board** standing on the left-hand dock, while the underwater world is the second half of the same scene. That gives the whole game a much stronger identity than the typical menu → spin → animation → win casino flow.

# The Fish Market

Every fish has a price - a multiplier on your bet - and **the prices change every round**.

## The board

A sign on the left-hand dock lists every fish with the price it pays this round, one row per depth zone, shallowest first:

| Row     | Fish                                                                                     |
| ------- | ---------------------------------------------------------------------------------------- |
| Shallow | Shrimp, Sardine, Blue Cod, Barracuda, Guppy, Clownfish                                   |
| Reef    | Napoleon Wrasse, Turtle, King Crab, Snapper, Grouper, Trevally                           |
| Deep    | Sting Ray, Bluefin Tuna, Shark, Barracuda (the big one), Pufferfish, Swordfish, Stingray |
| Abyss   | Lanternfish, Jellyfish, Starfish, Whale, Squid, Sea Dragon                               |
| Jackpot | The Kraken                                                                               |

- Each fish keeps its place on the board; only its price changes.
- The dearest price in each row is picked out in gold.
- Before the first cast the board is an empty sign. After a round it keeps that round's prices, with the fish the hook landed ringed, until the next cast. It is hidden while the hook is down.
- On a phone the board is smaller; on a landscape phone the zone names give way to coloured stripes.

## The prices

Each depth zone has a fixed **pool of prices**, one per fish, listed in ascending order down the zone's roster. The market is the same every round for a volatility; only the volatility changes the prices.

Which fish the hook lands within a zone is random, and every fish in the zone is equally likely. Prices are fixed; luck isn't.

## The reveal

Pressing Cast opens the round, then a pop-up deals the market: each fish drops onto the board with a small bounce, one after another (about two seconds for the whole deal), the prices hold for a moment, and the board shrinks away onto the dock. It takes about 3.5 seconds; a tap or a key skips straight to the hook going down. Players who ask for reduced motion get the prices without the bouncing.

The bet and the volatility are locked in _before_ the market is dealt, so a player can't choose them to suit a market they've seen. (They couldn't gain from it anyway - see [why rotating prices can't break the RTP](#why-rotating-prices-cant-break-the-rtp).)

# Volatility

Volatility replaces the old target-selection button. It does one thing: it sets **how likely the hook is to dive into each depth zone**.

| Level  | The hook                     | In the game                                         |
| ------ | ---------------------------- | --------------------------------------------------- |
| Low    | mostly stays in the shallows | smaller swings, a smaller jackpot (×30)             |
| Medium | dives to a mix of depths     | the default (jackpot ×50)                           |
| High   | dives deep more often        | bigger swings, a bigger jackpot (×75), extreme ×100 |

A button in the bottom bar (where the Targets button used to be) shows the current level - its name and one to three chevrons for how deep the hook tends to dive. It opens a picker with all three levels and a line on what each does; picking one applies it and closes the picker. The bet, the volatility and the Bonus button lock from the moment the cast is pressed until the catch is landed.

Every volatility has the **same 96% RTP**. They differ in how the return is spread: where the hook goes, how much the fish in each zone are worth, and how big the jackpot is.

# What the Hook Lands

The Kraken lives in the jackpot zone at the very bottom of the world and is the only fish there; the hook goes all the way down only when the Kraken is the catch. Every other fish is an ordinary fish in one of the four zones above it.

Nothing is selected, so there is no "win" or "miss" against a target. **Every cast lands exactly one fish** and pays `bet × price`. If the price is under 1 the cast returns less than the bet.

# Mathematical Model & RTP

`Hooked` uses a single predetermined outcome per round: the server rolls the market and the catch together when the round opens, from one provably-fair stream, and the presentation only depicts them.

The game targets a **96% theoretical RTP**: over a very large number of rounds, about $96 of every $100 bet is returned, with 4% the house edge. This holds for **every volatility**. Individual rounds and sessions vary significantly.

## How a round pays

1. **The market is dealt.** Each zone's price pool is shuffled across the zone's fish.
2. **The hook dives.** The volatility's odds pick a depth zone.
3. **The fish is landed.** A fish in that zone is picked, all equally likely.
4. **The payout is `bet × that fish's price` on this round's market**, rounded to the cent.

## Where the 96% comes from

Each volatility stores its zone **odds**, the Kraken's **jackpot** and a price **range** per zone, spread evenly across the zone's fish. Every landed fish pays **more than the bet** (the lowest price is x1.05), so a catch can never lose money. The return is balanced by the other side: a hooked fish can **get away** and pay nothing, and the server derives that chance per volatility so the whole volatility returns exactly the RTP target, once the Kraken and the **bonus multipliers** (below) have taken their share. So the RTP is a constant of the code, not a property of hand-entered numbers: change an odds, a range or a bonus and the escape chance moves, and a test fails if any volatility lands outside 0.5 percentage points of 96% or a landed fish pays 1x or less. `pnpm solve:payouts` prints each volatility's RTP, escape chance and how often every piece of extraction gear is called in.

About 1 round in 4 (24-30%) pays enough to call in the crane or better, at every volatility. Most of the rest is the rod: a fish that got away (about 54-59%, rising with volatility).

The current tables (first-pass values; tune them in `server/src/constants.ts`):

**Low - RTP 96.05%, crane or better on 24.8% of casts**

| Zone    | Chance | Prices (× bet) |
| ------- | ------ | -------------- |
| Shallow | 38.00% | 0.20 - 0.40    |
| Reef    | 32.00% | 0.40 - 0.79    |
| Deep    | 21.00% | 1.50 - 2.40    |
| Abyss   | 8.90%  | 2.50 - 5.00    |
| Jackpot | 0.10%  | 30             |

**Medium - RTP 96.04%, crane or better on 22.2% of casts**

| Zone    | Chance | Prices (× bet) |
| ------- | ------ | -------------- |
| Shallow | 40.00% | 0.16 - 0.33    |
| Reef    | 33.00% | 0.33 - 0.66    |
| Deep    | 19.50% | 1.50 - 2.50    |
| Abyss   | 7.40%  | 3.00 - 7.00    |
| Jackpot | 0.10%  | 50             |

**High - RTP 95.91%, crane or better on 20.6% of casts**

| Zone    | Chance | Prices (× bet) |
| ------- | ------ | -------------- |
| Shallow | 41.00% | 0.15 - 0.30    |
| Reef    | 34.00% | 0.30 - 0.60    |
| Deep    | 19.00% | 1.50 - 2.60    |
| Abyss   | 5.90%  | 3.00 - 9.00    |
| Jackpot | 0.10%  | 75             |

**Extreme - RTP 95.98%, crane or better on 18.1% of casts**

| Zone    | Chance | Prices (× bet) |
| ------- | ------ | -------------- |
| Shallow | 43.00% | 0.14 - 0.28    |
| Reef    | 35.00% | 0.28 - 0.57    |
| Deep    | 17.50% | 1.50 - 2.80    |
| Abyss   | 4.40%  | 3.50 - 12.00   |
| Jackpot | 0.10%  | 100            |

### Bonus multipliers

Every round highlights 1 to 5 fish with a bonus. One landed catch in 20 is a highlighted one and pays **price × bonus** (×2 50%, ×3 30%, ×5 15%, ×10 5%). It is part of the 96%, not on top of it. A bonus on a deep or abyss catch is what usually calls in the helicopter and the Chinook.

## Why rotating prices can't break the RTP

Every fish in a zone is equally likely, and a shuffle deals a zone the same prices whichever fish gets which. So whatever the arrangement on the board, the expected return of a round is the same number - the average price of each zone, weighted by the volatility's odds. A player who sees a market they like gains nothing: the bet and volatility are fixed before it is dealt, and it can't change the expected return even if they weren't.

## Fairness

The market and the catch both come from the round's seed triple (server seed, client seed, nonce) and the volatility. After the server seed is revealed, `POST /api/game/verify` re-derives both from those inputs; a match is the proof. The client never rolls anything: it presents what the server dealt.

## Known limit: there is no dud outcome yet

Holding 96% with no losing cast forces most prices below 1×, and it caps the variance - even at High volatility most casts land a fish worth well under the bet, with a rare fat one. That is why volatility today changes the _spread_ more than it changes the feel, and why the shallow prices are so low. [Junk](#junk-the-next-step) is the fix.

# Junk (the next step)

_Not built yet. The art is in `src/assets/junk/`._

Junk objects are things a hook can land instead of a fish: a tyre, an old boot, a tin can, a trolley, a toilet seat, a road cone, an e-scooter, a bra, undies, flip-flops, a wok, a noodle packet. They pay nothing. They are the game's **losing cast**, and they are the main RTP lever:

- Junk takes a share of the odds at 0×, so the prices of the _fish_ rise to compensate - shallow fish can finally pay 1× or more.
- Volatility becomes what it says: high volatility dives deep more often _and_ comes up with junk more often, so most casts lose and the rest can be huge.
- The server's normaliser already supports it: junk is one more row in a volatility's odds with a price of 0, and every other price rescales to hold 96%.

Questions to settle when the step is built, none decided: how junk shows in the world (static, drifting, sinking); which gear lands it (probably the rod, with a different reaction); how the "HOOKED!" splash names it; how often each volatility lands it; and whether the board lists a junk row at 0×.

# Extraction

Extraction is a presentation system driven by the server's payout multiplier:

| Gear       | Called in from | In the harbour                                               |
| ---------- | -------------- | ------------------------------------------------------------ |
| Rod        | always         | the fisherman on his boat; the only gear for most catches    |
| Crane      | ×1.5           | the dock crane swings out over the hook                      |
| Helicopter | ×3             | called in over the crane                                     |
| Chinook    | ×10            | the heaviest lift - the Kraken, or a bonus on an abyss catch |

The thresholds are placeholders sized to the market's price range (the crane for the better deep and abyss catches, the helicopter for the best of the abyss, the Chinook for the Kraken), found in `simExtraction.ts`. Each gear takes the strain in turn: the fish stays stuck while a gear pulls, then gives, and the next gear is needed. The multiplier counts up as the fish rises, holds while a gear strains, and lands on the catch's real price. The size of the landed fish follows the multiplier, not the species.

A catch worth less than the bet is landed by the rod alone, with the multiplier shown from the start, and the fisherman reacts with disappointment instead of a cheer.

# Bonus concepts for evaluation

These are design proposals, not approved game rules. No purchase prices, trigger odds, payout multipliers, feature RTP or maximum wins are committed. Environmental events remain ambient; multiplier events reveal a payout effect; bonus features add a named ruleset, recovery step or multi-cast sequence.

### Re-Cast

Proposed one-round add-on: the first junk catch or escaped fish grants exactly one recovery cast at the original bet and volatility, with no additional wager debit. The retry can lose and cannot trigger another retry. A landed fish is not covered in this initial proposal, even one worth less than the bet, and the feature card must say so.

The accepted feature round contains both the first attempt and any recovery result. Only the resolved payout is credited once. This is not a refund or a guaranteed win. Price, eligibility and mathematical distribution remain to be determined. (It needs junk, which is not built yet.)

UI: a spare-hook icon and SECOND CAST READY before play. On an eligible loss show JUNK CAUGHT or GOT AWAY, followed by SECOND CAST ACTIVATED. Cross out one spare-hook indicator and show RECOVERY CAST. If the first attempt lands a fish, the one-round feature ends unused; disclose this in the rules. No purchase offer appears after the loss.

### Lucky Bait

Proposed one-round wager variant with a separately defined distribution of multiplier-bearing successful catches. It reuses Golden Current, Ancient Relic, Deep Sea Shrine and Abyssal Event presentation. It does not promise a successful catch, prevent escape or turn junk into a paying fish.

UI: glowing bait icon, LUCKY BAIT ACTIVE, and a feature cost shown before casting. During the round, show only awarded multipliers. Rules must define whether effects combine or replace each other and which payout amount they modify. Do not advertise improved odds or larger average wins until supported by the actual model.

### Feeding Frenzy

Proposed distinct bonus round: a short sequence of five automatic casts with a running feature total. Five is a prototype count, not a final mathematical commitment. Each cast can land a fish, retrieve junk or lose a fish. The feature is not five guaranteed wins.

For a first prototype, keep the accepted bet and volatility fixed throughout and disallow mid-feature changes. Outcomes and awards come from the accepted feature record. Choose natural triggering or direct purchase as the initial entry method before production; if both are supported, show their different entry rules explicitly.

UI: a school-of-fish icon, FEEDING FRENZY introduction, CAST 1 OF 5 and FEATURE TOTAL. Use brief sub-results; show one final summary and reconcile all credits exactly once. Wager controls return when the feature completes.

### Monster Hunt

Proposed premium feature focused on one giant-creature encounter and a bespoke extraction. Reuse crane, helicopter and Kraken assets to make a distinct sequence, rather than treating ordinary large fish as bonus triggers.

Define a dedicated outcome table and eligible creature pool. Entry guarantees the feature encounter only; success, escape probability and any minimum award remain unresolved and must be stated in the final rules. Do not label it a guaranteed jackpot.

UI: giant-creature silhouette, a clear feature introduction, preparation and extraction states, and one final result. Equipment changes communicate the spectacle without implying that timing or player input improves the payout.

# Open questions

- **Junk** - see above; it settles most of the questions below.
- **The numbers** - every odds, price and jackpot here is a first pass. Tuning them is the point of the next step.
- **Seeing the market before casting** - today the market is dealt on Cast, so the bet and volatility can't depend on it. Showing the _next_ market in advance would not change the RTP (see above) and would let a player read the board while choosing, but it would take the reveal away. Not decided.
- **Reading the market during the dive** - the board scrolls away with the dock while the hook is down. Price tags on the swimming fish, or a compact legend on screen, would keep the prices in view. Not built.
- **The Kraken's landing** - it is reeled in whole at the bottom, with its multiplier shown but no crane or helicopter sequence; its bespoke extraction is still to come (`docs/JACKPOT.md`).
- **Portraits** - King Crab and Starfish have no portrait yet and show their name on the board.
