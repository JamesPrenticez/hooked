# Deep Catch — Build Plan

## Development Principles

- Build the game incrementally; never attempt large features in a single implementation pass.
- Every milestone should result in a runnable, testable state.
- The **server is authoritative** for player sessions, balances, bets, RNG, outcomes, payouts and round state.
- The **client is responsible for presentation**: UI, animation, rendering, audio, camera and VFX.
- The client must never determine or modify gambling outcomes.
- The development environment must use a **Mock Game Server** with the same API contract as the eventual production server. It performs a real HMAC-signed operator launch and runs a provably-fair RNG — it is a real HTTP service, not a client-side fake.
- All client/server communication goes through **one endpoint** (`POST /api/game/play`, a `{ message: { <oneVariant> } }` envelope) plus a fixed set of read endpoints. See `docs/ARCHITECTURE.md` §5.
- **`src/api/index.ts` is the only file that knows the wire envelope.** Stores and components call typed helpers; they never see a `message` shape or call `fetch`.
- Money is always a **decimal string** on the wire, never a float.
- The mathematical result must be determined before the fishing presentation begins.
- On boot the client calls `POST /api/game/current` and resumes any in-progress round from authoritative state.
- The client may duplicate **only the payout multiplier table** (for drawing the paytable) — never the probability tables. If duplicated, changing one copy means changing the other.
- Prefer reusable systems over one-off animation logic.
- Use placeholder assets wherever possible until the underlying system is proven.
- Avoid adding dependencies unless there is a clear technical requirement.
- Keep each milestone small enough that it can be reviewed and corrected before moving forward.

---

# 0. Project Foundation

### Goal

Establish the basic project structure and development tooling.

### 0.1 Project Structure

- [ ] Establish the Animo-standard `src/` layout + a sibling `server/` directory (see `docs/ARCHITECTURE.md` §4)
- [ ] Establish wire-contract types in `src/types/api.ts`
- [ ] Establish configuration/constants
- [ ] Establish development/debug utilities
- [ ] Establish environment configuration

### 0.2 Client Foundation

- [ ] Application bootstrap — one `<Application>` (`@pixi/react`); HTML overlays are siblings of the canvas, not children
- [ ] `loading → tutorial → game` phase machine; advance only after asset load **and** Pixi's first non-empty frame
- [ ] Scene manager
- [ ] Scene transitions
- [ ] Zustand stores in `src/stores/`; cross-store effects only in `components/system/StoreSync.tsx`
- [ ] Headless controllers (autoplay/auto-bet) render `null` and drive sequences through stores
- [ ] Game lifecycle

### 0.3 Server Foundation

- [ ] Server application bootstrap
- [ ] API routing
- [ ] Request validation
- [ ] Error handling
- [ ] Server configuration
- [ ] Development logging

### 0.4 Shared Foundation

- [ ] Shared TypeScript types
- [ ] API request types
- [ ] API response types
- [ ] Domain identifiers
- [ ] Error response types

### Acceptance Criteria

Client and server can run independently in development and communicate through a basic health/session endpoint.

---

# 1. Client / Server API Contract

### Goal

Define the communication contract before implementing gameplay.

The client must be developed against the API rather than directly against server implementation details.

### 1.1 Session API

- [ ] `POST /api/session` (unauthenticated) → HMAC-signed `POST /operator/launch` → `sessionToken`
- [ ] Bearer-token auth on every `/api/game/*` and `/api/seed/*` call
- [ ] `POST /api/session/refresh` — rotate token (once per token)
- [ ] Adopt `?sessionToken=` from the launch URL and strip it from the address bar
- [ ] `POST /api/game/current` — balance + resumable round on boot
- [ ] `GET /api/game/balance` — authoritative live balance

### 1.2 Game Action API — the `/game/play` envelope

- [ ] `POST /api/game/play` with `{ message: { <oneVariant> } }` → `{ message, roundId }`
- [ ] `start` variant — place bets + open the round (server generates outcome now)
- [ ] `complete` variant — presentation finished, settle the round
- [ ] `GET /api/game/round/{id}` — full round detail
- [ ] `GET /api/game/history` — recent completed rounds
- [ ] Decimal-string money; zero fields emitted, not omitted
- [ ] `metadata.balance` treated as non-authoritative on multi-action responses

### 1.3 Error Handling

- [ ] Invalid session
- [ ] Insufficient balance
- [ ] Invalid bet
- [ ] Round already started
- [ ] Round already completed
- [ ] Server error
- [ ] Network failure

### 1.4 Wire Contract

- [ ] `src/types/api.ts` (`@/types/api`) holds the wire types
- [ ] Mock server mirrors the same shapes; kept in sync by hand (no shared package)
- [ ] `src/api/index.ts` exposes typed helpers only — `createSession()`, `startRound(bets)`, `completeRound(id)`, `getCurrent()`, `getBalance()`, `getHistory()`
- [ ] Two-vocabulary conversion (UI strings ↔ wire enums) happens only in `src/api/index.ts`

```text
CLIENT
   ↓  api.startRound(bets)
src/api/index.ts   ── wraps { message: { start: { bets } } }
   ↓
MOCK / PRODUCTION SERVER
   ↓
{ message: RoundResult, roundId }
```

### Acceptance Criteria

The complete API contract exists before the real gambling round implementation begins, and nothing outside `src/api/index.ts` references the `message` envelope.

---

# 2. Mock Game Server

### Goal

Create a local server that behaves like the future production game server.

The Mock Game Server must not be a client-side fake.

It should be a real network service.

### 2.1 Mock Session

- [ ] `POST /api/session` → real HMAC-SHA256-signed round-trip to `POST /operator/launch`
- [ ] `X-Operator-ID` / `X-Timestamp` / `X-HMAC-SHA256` headers; HMAC secret server-side only
- [ ] Generate `sessionToken`; scope session to one player + game + currency
- [ ] `requireSession` middleware gates `/api/game/*` and `/api/seed/*`
- [ ] Assign development currency + balance; reset balance on server start
- [ ] Store session state

### 2.2 Mock Player

- [ ] Player identity
- [ ] Balance
- [ ] Currency
- [ ] Session state
- [ ] Round history

### 2.3 Mock Round

- [ ] Create round
- [ ] Accept bets
- [ ] Lock bets
- [ ] Generate outcome
- [ ] Resolve payout
- [ ] Update balance
- [ ] Complete round

### 2.4 Development Controls

- [ ] Force specific depth
- [ ] Force specific fish
- [ ] Force specific tier
- [ ] Force Kraken
- [ ] Seeded outcomes
- [ ] Reset player balance
- [ ] Reset session
- [ ] Simulate server errors
- [ ] Simulate network latency
- [ ] All debug controls gated by `VITE_DEBUG` / `/api/debug/*`, stripped for production

### 2.5 Provably-Fair Seeds

- [ ] `server/src/rng.ts` — HMAC-SHA256 byte stream over `(serverSeed, clientSeed, nonce)`
- [ ] Consume the stream to roll depth → fish → tier
- [ ] `POST /api/seed/{current,rotate,reveal,upcoming}` — rotate blocked mid-round
- [ ] `POST /api/game/verify` — recompute a past outcome from its seed triple

### Acceptance Criteria

The client can connect to the Mock Game Server and complete a full round without any client-side outcome generation, and a past round can be re-derived from its revealed seeds.

---

# 3. Authoritative Server Mathematics

### Goal

Implement the actual mathematical model on the server.

### 3.1 Outcome Generation

- [ ] Define depth probabilities
- [ ] Define fish probabilities
- [ ] Define outcome hierarchy
- [ ] Implement RNG
- [ ] Generate server-side outcome

### 3.2 Betting

- [ ] Validate bets
- [ ] Validate balance
- [ ] Lock bets
- [ ] Prevent modification after lock

### 3.3 Payout

- [ ] Resolve depth bets
- [ ] Resolve fish bets
- [ ] Support multiple simultaneous bets
- [ ] Calculate total payout
- [ ] Calculate net result

### 3.4 Balance

- [ ] Deduct wager
- [ ] Apply payout
- [ ] Return authoritative balance
- [ ] Prevent duplicate payout

### 3.5 Mathematical Testing

- [ ] Unit tests
- [ ] Probability tests
- [ ] RTP simulation
- [ ] Combined bet tests
- [ ] Edge case tests

### Acceptance Criteria

The server can independently process a complete round and produce a mathematically correct result.

---

# 4. Player Session & Client Synchronisation

### Goal

Make the client operate entirely from authoritative server state.

### 4.1 Session

- [ ] Initialise session
- [ ] Store session locally
- [ ] Restore session
- [ ] Handle expired session

### 4.2 Balance

- [ ] Receive server balance
- [ ] Display balance
- [ ] Animate balance changes
- [ ] Never locally calculate authoritative balance

### 4.3 Round Synchronisation

- [ ] Receive round ID
- [ ] Receive locked bets
- [ ] Receive outcome
- [ ] Receive payout
- [ ] Receive final balance

### 4.4 Failure Recovery

- [ ] Reconnect
- [ ] Recover active round
- [ ] Recover completed round
- [ ] Handle interrupted animation
- [ ] Prevent duplicate requests

### Acceptance Criteria

Reloading the client does not create an inconsistent gambling state.

---

# 5. Loading Screen

### Goal

Create the game's initial presentation and asset loading pipeline.

### 5.1 Visual

- [ ] Background
- [ ] Deep Catch logo
- [ ] Loading indicator
- [ ] Progress display
- [ ] Loading animation

### 5.2 Technical

- [ ] Load required assets
- [ ] Initialise client
- [ ] Establish server session (`POST /api/session` → operator launch)
- [ ] `POST /api/game/current` — retrieve balance + resume any in-progress round
- [ ] Handle connection failure

### Acceptance Criteria

The application loads assets, connects to the Mock Game Server and reaches the main game with a valid session and balance.

---

# 6. Tutorial

### Goal

Teach the game using the real client/server architecture.

The tutorial may use a **server-controlled development/tutorial outcome**.

### 6.1 Tutorial Flow

- [ ] Explain depth betting
- [ ] Explain fish betting
- [ ] Explain multiple bets
- [ ] Explain cast
- [ ] Explain descent
- [ ] Explain catch
- [ ] Explain extraction
- [ ] Explain payout

### 6.2 Guided Interaction

- [ ] Highlight betting UI
- [ ] Restrict invalid interaction
- [ ] Submit tutorial bet to server
- [ ] Receive controlled tutorial outcome
- [ ] Play normal fishing presentation

### Acceptance Criteria

A new player can complete the tutorial through the same API flow used by normal gameplay.

---

# 7. Harbour / Main Hub

### Goal

Create the primary game environment.

### 7.1 Environment

- [ ] Harbour
- [ ] Dock
- [ ] Ocean
- [ ] Buildings
- [ ] Cranes
- [ ] Boats
- [ ] Props
- [ ] Lighting

### 7.2 Fisherman

- [ ] Character
- [ ] Idle
- [ ] Fishing
- [ ] Reaction
- [ ] Victory

### 7.3 Ambient Activity

- [ ] Moving boats
- [ ] Workers
- [ ] Crane movement
- [ ] Birds
- [ ] Water movement
- [ ] Particles

### Acceptance Criteria

The harbour provides the game's primary visual identity and acts as the home state between rounds.

---

# 8. Betting Board

### Goal

Build the complete client-side betting interface connected to the server.

### 8.1 Betting UI

- [ ] Depth selections
- [ ] Fish selections
- [ ] Bet amount
- [ ] Add/remove bets
- [ ] Clear bets
- [ ] Confirm bets
- [ ] Balance display
- [ ] Total wager

### 8.2 Client Validation

- [ ] Minimum bet
- [ ] Maximum bet
- [ ] Available balance
- [ ] Invalid combinations
- [ ] Duplicate selections

Client validation is for user experience only.

The server must independently validate every bet.

### 8.3 Server Interaction

- [ ] Submit bet request
- [ ] Receive server confirmation
- [ ] Lock betting interface
- [ ] Handle server rejection
- [ ] Handle network failure

### Acceptance Criteria

A player can place multiple bets and submit them to the Mock Game Server successfully.

---

# 9. Round Lifecycle

### Goal

Connect the betting system to the authoritative server round.

```text
BETTING
   ↓
SUBMIT BETS
   ↓
SERVER VALIDATION
   ↓
BETS LOCKED
   ↓
SERVER GENERATES OUTCOME
   ↓
CLIENT RECEIVES RESULT
   ↓
FISHING PRESENTATION
```

### 9.1 Round Creation

- [ ] Request round
- [ ] Receive round ID
- [ ] Associate bets with round

### 9.2 Round Resolution

- [ ] Server generates outcome
- [ ] Server resolves bets
- [ ] Server calculates payout
- [ ] Server updates balance

### 9.3 Client

- [ ] Receive authoritative result
- [ ] Store presentation result
- [ ] Begin fishing sequence
- [ ] Prevent betting interaction

### Acceptance Criteria

The first complete server-authoritative round can be played from betting through result.

---

# 10. Cast

### Goal

Transition from the harbour into the fishing sequence.

### 10.1 Preparation

- [ ] Fisherman preparation
- [ ] Rod animation
- [ ] Camera movement
- [ ] Line positioning

### 10.2 Cast

- [ ] Cast animation
- [ ] Hook trajectory
- [ ] Water entry
- [ ] Splash
- [ ] Underwater transition

### Acceptance Criteria

The cast begins only after the server has accepted and resolved the round.

---

# 11. Underwater Environment

### Goal

Create the depth-based underwater world.

### 11.1 Depths

- [ ] Shallow
- [ ] Reef
- [ ] Deep
- [ ] Abyss
- [ ] Trench

### 11.2 Environmental Layers

- [ ] Background
- [ ] Lighting
- [ ] Particles
- [ ] Bubbles
- [ ] Caustics
- [ ] Fog
- [ ] Debris

### 11.3 Procedural Systems

- [ ] Particle generation
- [ ] Ambient fish
- [ ] Depth variation
- [ ] Environmental movement

### Acceptance Criteria

The same underwater system can visually represent all five depth zones.

---

# 12. Fish System

### Goal

Create a reusable, data-driven fish presentation system.

### 12.1 Fish Data

- [ ] Fish ID
- [ ] Name
- [ ] Depth
- [ ] Tier
- [ ] Asset
- [ ] Scale
- [ ] Movement configuration
- [ ] Extraction configuration

### 12.2 Rendering

- [ ] Spawn fish
- [ ] Movement
- [ ] Scaling
- [ ] Orientation
- [ ] Animation

### 12.3 Fish Presentation

- [ ] Ambient fish
- [ ] Target fish
- [ ] Hooked state
- [ ] Struggle
- [ ] Reveal

### Acceptance Criteria

Any configured fish can be presented without changing gambling logic.

---

# 13. Descent

### Goal

Present the server-selected outcome as the hook descends.

The client receives the target depth/fish from the server and creates the appropriate presentation.

### 13.1 Hook

- [ ] Hook asset
- [ ] Fishing line
- [ ] Hook movement

### 13.2 Camera

- [ ] Follow hook
- [ ] Smooth movement
- [ ] Depth transitions

### 13.3 Environment

- [ ] Ambient fish
- [ ] Particles
- [ ] Darkness
- [ ] Lighting
- [ ] Audio progression

### Acceptance Criteria

The hook visually reaches the server-selected target depth without changing the outcome.

---

# 14. Encounter & Hook

### Goal

Create the major suspense moment.

### 14.1 Target Reveal

- [ ] Target fish enters
- [ ] Camera focuses target
- [ ] Anticipation

### 14.2 Hook

- [ ] Fish approaches hook
- [ ] Hook impact
- [ ] Fish reaction
- [ ] Line tension
- [ ] Camera shake
- [ ] VFX

### Acceptance Criteria

The player clearly experiences the moment where the predetermined outcome becomes visually confirmed.

---

# 15. Ascent

### Goal

Return from the target depth to the harbour.

### 15.1 Ascent

- [ ] Follow fishing line
- [ ] Accelerate movement
- [ ] Depth transitions
- [ ] Lighting increase
- [ ] Surface approach

### 15.2 Surface

- [ ] Surface breach
- [ ] Splash
- [ ] Harbour reveal
- [ ] Fisherman reaction

### Acceptance Criteria

The player transitions smoothly from the deepest underwater environment back into the harbour.

---

# 16. Extraction

### Goal

Create the game's signature spectacle.

Extraction is selected from the server-provided catch tier.

### 16.1 Extraction Framework

- [ ] Extraction controller
- [ ] Tier mapping
- [ ] Sequence system
- [ ] Camera control
- [ ] Timing

### 16.2 Extraction Levels

- [ ] Rod
- [ ] Winch
- [ ] Crane
- [ ] Heavy crane
- [ ] Helicopter
- [ ] Ultimate extraction

### 16.3 Reactions

- [ ] Fisherman
- [ ] Boat
- [ ] Harbour workers
- [ ] Machinery
- [ ] Environmental reactions

### 16.4 Kraken

- [ ] Trench reveal
- [ ] Tentacles
- [ ] Eye reveal
- [ ] Extreme struggle
- [ ] Harbour reaction
- [ ] Ultimate extraction

### Acceptance Criteria

The extraction presentation accurately reflects the server-selected outcome without affecting it.

---

# 17. Payout Presentation

### Goal

Present the server-calculated result.

### 17.1 Catch Reveal

- [ ] Fish name
- [ ] Depth
- [ ] Tier
- [ ] Multiplier

### 17.2 Win

- [ ] Winning bets
- [ ] Total payout
- [ ] Big win treatment
- [ ] Jackpot treatment

### 17.3 Balance

- [ ] Receive authoritative final balance
- [ ] Animate balance
- [ ] Never calculate final balance locally

### Acceptance Criteria

The displayed result exactly matches the authoritative server response.

---

# 18. Round Completion

### Goal

Safely finish a round and return to betting.

### 18.1 Completion

- [ ] Mark presentation complete
- [ ] Confirm round completion
- [ ] Receive final server state
- [ ] Unlock betting

### 18.2 Recovery

- [ ] Handle client disconnect
- [ ] Recover completed round
- [ ] Recover active round
- [ ] Prevent duplicate completion

### Acceptance Criteria

A completed round cannot be paid out twice and the player can begin the next round safely.

---

# 19. Audio

### Goal

Build the game's audio identity.

### 19.1 Environment

- [ ] Harbour ambience
- [ ] Ocean
- [ ] Underwater
- [ ] Boats
- [ ] Machinery

### 19.2 Gameplay

- [ ] Bet
- [ ] Cast
- [ ] Splash
- [ ] Reel
- [ ] Hook
- [ ] Fish struggle

### 19.3 Extraction

- [ ] Winch
- [ ] Crane
- [ ] Heavy machinery
- [ ] Helicopter
- [ ] Kraken

### 19.4 Music

- [ ] Harbour
- [ ] Descent
- [ ] Encounter
- [ ] Extraction
- [ ] Big win
- [ ] Jackpot

---

# 20. UI System

### Goal

Create the complete visual UI system.

### Core

- [ ] Balance
- [ ] Betting
- [ ] Confirm
- [ ] Clear
- [ ] Settings
- [ ] Help

### Results

- [ ] Catch
- [ ] Multiplier
- [ ] Win amount
- [ ] Big win
- [ ] Jackpot

### Responsive

- [ ] Target resolution
- [ ] Aspect ratios
- [ ] Safe areas
- [ ] Scaling

---

# 21. Game Information

### Goal

Provide player-facing game information.

### Fish Guide

- [ ] Fish list
- [ ] Fish images
- [ ] Depth
- [ ] Tier
- [ ] Payouts

### Rules

- [ ] How to play
- [ ] Depth betting
- [ ] Fish betting
- [ ] Multiple bets
- [ ] Payouts
- [ ] RTP
- [ ] Volatility

### Responsible Gambling

- [ ] Required messaging
- [ ] Required regulatory information

---

# 22. Round History

### Goal

Display authoritative historical round information.

### Data

- [ ] Round ID
- [ ] Bets
- [ ] Outcome
- [ ] Depth
- [ ] Fish
- [ ] Multiplier
- [ ] Payout

### Server

- [ ] Retrieve history
- [ ] Pagination/limits
- [ ] Handle missing history

### UI

- [ ] Recent results
- [ ] Fish icons
- [ ] Multipliers
- [ ] Win/loss presentation

---

# 23. Mathematical Validation

### Goal

Validate the server-side mathematics independently from the client.

### RTP

- [ ] Individual bet RTP
- [ ] Combined bet RTP
- [ ] Overall RTP
- [ ] House edge

### Simulation

- [ ] Large round simulation
- [ ] Outcome frequencies
- [ ] Average payout
- [ ] RTP
- [ ] Hit frequency
- [ ] Maximum win

### Volatility

- [ ] Win frequency
- [ ] Losing streaks
- [ ] Big win frequency
- [ ] Jackpot frequency
- [ ] Multiplier distribution

### Regression

- [ ] Automated math tests
- [ ] Probability configuration versioned
- [ ] Payout configuration versioned
- [ ] Changes trigger revalidation

---

# 24. API Reliability & Security

### Goal

Ensure the client cannot manipulate authoritative game state.

### Server Authority

- [ ] Server validates all bets
- [ ] Server controls balance
- [ ] Server controls RNG
- [ ] Server controls outcome
- [ ] Server controls payout
- [ ] Server controls round state

### Request Validation

- [ ] Validate session
- [ ] Validate player
- [ ] Validate round
- [ ] Validate bet amount
- [ ] Validate bet type
- [ ] Validate currency

### Replay Protection

- [ ] Unique round IDs
- [ ] Request IDs
- [ ] Duplicate request protection
- [ ] Duplicate payout protection

### Client Trust Boundary

The server must assume the client is untrusted.

The client may request:

```text
"Place these bets."
```

The server decides:

```text
"These bets are valid."
```

The client may receive:

```text
"The outcome is Shark."
```

The client presents:

```text
"Shark caught!"
```

The client must never be able to request:

```text
"Make my outcome Shark."
```

or:

```text
"Set my balance to $500."
```

---

# 25. Performance & Production

### Client

- [ ] FPS
- [ ] Texture memory
- [ ] Asset loading
- [ ] Particle performance
- [ ] Animation performance

### Server

- [ ] Request latency
- [ ] Concurrent sessions
- [ ] Round throughput
- [ ] Error rate
- [ ] Logging
- [ ] Monitoring

### Integration

- [ ] Network latency testing
- [ ] Disconnect testing
- [ ] Server restart testing
- [ ] Client reload testing
- [ ] Interrupted round testing

---

# 26. Production Platform Integration

### Goal

Replace the Mock Game Server with the real gambling platform/server without redesigning the client.

### 26.1 Integration

- [ ] Production authentication
- [ ] Production player session
- [ ] Production balance
- [ ] Production currency
- [ ] Production RNG integration
- [ ] Production round lifecycle
- [ ] Production wager handling
- [ ] Production payout handling

### 26.2 API Compatibility

- [ ] Verify production API against shared contracts
- [ ] Remove mock-only behaviour
- [ ] Remove forced outcomes
- [ ] Remove development balance
- [ ] Remove debug controls

### Acceptance Criteria

The production server can replace the Mock Game Server while the client presentation layer remains fundamentally unchanged.

---

# 27. Polish & Juice

### Goal

Turn the functional game into a compelling gambling product.

### Animation

- [ ] Easing
- [ ] Secondary motion
- [ ] Camera shake
- [ ] Particles
- [ ] Impact effects
- [ ] Transitions

### Environment

- [ ] Harbour activity
- [ ] Ocean movement
- [ ] Lighting
- [ ] Weather
- [ ] Water effects

### Wins

- [ ] Small win
- [ ] Medium win
- [ ] Big win
- [ ] Huge win
- [ ] Jackpot
- [ ] Kraken

---

# 28. Final Product Pass

### Complete Game

- [ ] Server-authoritative session
- [ ] Server-authoritative betting
- [ ] Server-authoritative RNG
- [ ] Server-authoritative outcome
- [ ] Server-authoritative payout
- [ ] Complete fishing sequence
- [ ] Complete fish roster
- [ ] Complete depth progression
- [ ] Complete extraction tiers
- [ ] Kraken
- [ ] Complete UI
- [ ] Audio
- [ ] Game information
- [ ] Round history
- [ ] RTP validation
- [ ] Performance validation
- [ ] Network failure testing
- [ ] Final art
- [ ] Final animation
- [ ] Final sound
- [ ] Internal playtest
- [ ] Stakeholder demo build
