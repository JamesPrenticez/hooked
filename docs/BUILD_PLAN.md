# Deep Catch — Build Plan

## Development Principles

- Build the game incrementally; never attempt large features in a single implementation pass.
- Every milestone should result in a runnable, testable state.
- The **server is authoritative** for player sessions, balances, bets, RNG, outcomes, payouts and round state.
- The **client is responsible for presentation**: UI, animation, rendering, audio, camera and VFX.
- The client must never determine or modify gambling outcomes.
- The development environment must use a **Mock Game Server** with the same API contract as the eventual production server. It performs a real HMAC-signed operator launch and runs a provably-fair RNG — it is a real HTTP service, not a client-side fake.
- All client/server communication goes through **one endpoint** (`POST /api/game/play`, a `{ message: { <oneVariant> } }` envelope) plus a fixed set of read endpoints. See `docs/ARCHITECTURE.md` §5.
- The server's API is documented in `server/openapi.yaml`, served as Swagger UI at `GET /docs`. It is hand-maintained: **any change to a server route, request or response shape must update `server/openapi.yaml` in the same commit.**
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

- [x] Establish the Animo-standard `src/` layout + a sibling `server/` directory (see `docs/ARCHITECTURE.md` §4)
- [x] Establish wire-contract types in `src/types/api.ts`
- [x] Establish configuration/constants (`src/constants/config.ts`, `server/src/config.ts`)
- [x] Establish development/debug utilities (`server/src/debug-state.ts` + `/api/debug/*`, client `DEBUG` flag — see milestone 2.4)
- [x] Establish environment configuration (`.env.example`; server reads `.env` via `node --env-file-if-exists`)

### 0.2 Client Foundation

- [x] Application bootstrap — one `<Application>` (`@pixi/react`); HTML overlays are siblings of the canvas, not children
- [x] `loading → tutorial → game` phase machine; advance only after asset load **and** Pixi's first non-empty frame (`src/hooks/useGameBootstrap.ts`, `src/stores/gameStore.ts`)
- [x] Scene manager (`src/components/SceneManager/`) — generic, keyed registry; not one-off per phase
- [x] Scene transitions (`src/hooks/useCrossfade.ts`) — 300ms crossfade, framework-agnostic so it's unit-testable without a renderer
- [x] Zustand stores in `src/stores/`; cross-store effects only in `components/system/StoreSync.tsx` (wires `api`'s `onSessionExpired` → phase reset)
- [ ] Headless controllers (autoplay/auto-bet) render `null` and drive sequences through stores — deferred: no betting/round system yet to drive one; lands with autoplay/auto-bet (milestones 8-9) using the same `components/system/` pattern as StoreSync
- [x] Game lifecycle — boot → phase transitions → StoreSync-driven reset on session-expiry; the round/session lifecycle itself is milestone 1/4/9

Placeholder scenes (`src/components/PlaceholderScene/`) stand in for
LoadingScreen/TutorialScreen/HarbourScreen (§5/§6/§7) — colored rect + label,
no image assets needed. Swapped out without touching the phase machine or
scene manager.

### 0.3 Server Foundation

- [x] Server application bootstrap (`server/src/index.ts`, stdlib `http`, nodemon reload)
- [x] API routing (`server/src/http.ts` — method+path router, JSON body parsing)
- [ ] Request validation (HMAC + bearer gate in place; bet/schema validation is milestone 3)
- [x] Error handling (`HttpError` → structured `{ error: { code, message } }`, 404 fallthrough)
- [x] Server configuration (`server/src/config.ts`)
- [x] Development logging (per-request method/path/status/ms)
- [x] API documentation (`server/openapi.yaml`, Swagger UI at `GET /docs`)

### 0.4 Shared Foundation

- [x] Shared TypeScript types (`src/types/api.ts`, mirrored by hand in the server)
- [x] API request types (`Bet`, `FishingOutcome`; `start`/`complete` land with the round milestone)
- [x] API response types (`SessionResponse`, `BalanceResponse`, `CurrentResponse`)
- [x] Domain identifiers (`DepthId`, `FishTier`)
- [x] Error response types (`ErrorBody`)

### Acceptance Criteria

Client and server can run independently in development and communicate through a basic health/session endpoint. — **met**: `pnpm server` (`/api/health`, `/api/session` via signed `/operator/launch`, bearer-gated `/api/game/{balance,current}`) and `pnpm dev` run independently; `src/api/index.ts` is the only client file that knows the wire.

---

# 1. Client / Server API Contract

### Goal

Define the communication contract before implementing gameplay.

The client must be developed against the API rather than directly against server implementation details.

### 1.1 Session API

- [x] `POST /api/session` (unauthenticated) → HMAC-signed `POST /operator/launch` → `sessionToken` (milestone 0; `server/src/routes/session.ts`)
- [ ] Bearer-token auth on every `/api/game/*` and `/api/seed/*` call — `/api/game/*` done (`server/src/sessions.ts` `requireSession`); `/api/seed/*` doesn't exist yet, lands with milestone 2.5
- [x] `POST /api/session/refresh` — rotate token (once per token) (`server/src/sessions.ts` `rotateToken`, `server/src/routes/session.ts`; old token invalidated immediately, no grace period)
- [x] Adopt `?sessionToken=` from the launch URL and strip it from the address bar (`src/api/index.ts` `adoptSessionTokenFromUrl` — not called from the app yet; wiring lands with milestone 5)
- [x] `POST /api/game/current` — balance + resumable round on boot (`server/src/routes/game.ts`; reflects an open round's bets, outcome withheld — see §30)
- [x] `GET /api/game/balance` — authoritative live balance (milestone 0)

### 1.2 Game Action API — the `/game/play` envelope

- [x] `POST /api/game/play` with `{ message: { <oneVariant> } }` → `{ message, roundId }` (`server/src/routes/game.ts`, `src/api/index.ts`)
- [x] `start` variant — place bets + open the round (server generates outcome now) (`server/src/rounds.ts` `openRound` — placeholder outcome/payout; real probability-weighted math is milestone 3)
- [x] `complete` variant — presentation finished, settle the round (`server/src/rounds.ts` `settleRound`)
- [x] `GET /api/game/round/{id}` — full round detail (`server/src/routes/game.ts`, `src/api/index.ts` `getRound`)
- [x] `GET /api/game/history` — recent completed rounds (`server/src/routes/game.ts`, `src/api/index.ts` `getHistory`)
- [x] Decimal-string money; zero fields emitted, not omitted (`server/src/money.ts`)
- [x] `metadata.balance` treated as non-authoritative on multi-action responses (always `"0"` — `server/src/routes/game.ts` `toRoundResult`)

### 1.3 Error Handling

- [x] Invalid session (`server/src/sessions.ts` `requireSession`, 401)
- [x] Insufficient balance (`server/src/routes/game.ts`, 400)
- [x] Invalid bet (`server/src/routes/game.ts` `validateBets`, 400)
- [x] Round already started (`server/src/routes/game.ts`, 409)
- [x] Round already completed (`server/src/routes/game.ts`, 409)
- [x] Server error (`server/src/http.ts` catch-all, 500)
- [x] Network failure (`src/api/index.ts` — a rejected `fetch()` normalizes to `ApiError("network_error")`)

### 1.4 Wire Contract

- [x] `src/types/api.ts` (`@/types/api`) holds the wire types
- [x] Mock server mirrors the same shapes; kept in sync by hand (no shared package) (`server/src/rounds.ts`)
- [x] `src/api/index.ts` exposes typed helpers only — `createSession()`, `startRound(bets)`, `completeRound(id)`, `getCurrent()`, `getBalance()`, `getHistory()` (also `getRound()`, `refreshSession()`, `adoptSessionTokenFromUrl()`)
- [x] Two-vocabulary conversion (UI strings ↔ wire enums) happens only in `src/api/index.ts` (no UI vocabulary exists yet to convert; nothing outside this file references the `message` envelope)

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

The complete API contract exists before the real gambling round implementation begins, and nothing outside `src/api/index.ts` references the `message` envelope. — **met**: full round lifecycle (`start`/`complete`/`round/{id}`/`history`), session refresh and the full error taxonomy are wired end-to-end against a real listening server (18 `node:test` cases in `server/src/routes/game.test.ts`, verified manually with `curl` — debit on start, credit on complete, round detail + history reflect it) and `src/api/index.ts` is still the only client file that knows the wire. Outcome/payout math is a deliberate flat placeholder (`server/src/rounds.ts`) — milestone 3 replaces it; no fish roster, dev controls or seeded RNG yet (milestones 2/3/12).

---

# 2. Mock Game Server

### Goal

Create a local server that behaves like the future production game server.

The Mock Game Server must not be a client-side fake.

It should be a real network service.

### 2.1 Mock Session

- [x] `POST /api/session` → real HMAC-SHA256-signed round-trip to `POST /operator/launch` (`server/src/routes/session.ts`, `server/src/routes/operator.ts`)
- [x] `X-Operator-ID` / `X-Timestamp` / `X-HMAC-SHA256` headers; HMAC secret server-side only (`server/src/operator-auth.ts`)
- [x] Generate `sessionToken`; scope session to one player + game + currency (`server/src/sessions.ts` `createSession`)
- [x] `requireSession` middleware gates `/api/game/*` — `/api/seed/*` doesn't exist yet, lands with milestone 2.5
- [x] Assign development currency + balance; reset balance on server start (`config.currency`/`config.startingBalance`, in-memory `Map` wiped per process)
- [x] Store session state (`server/src/sessions.ts` in-memory `byToken` map)

Landed as a byproduct of milestones 0/1, not new work this session — confirmed against
the code and covered by the existing 18-case suite (`server/src/routes/game.test.ts`,
`server/src/operator-auth.test.ts`): real HMAC round-trip, `invalid_session` 401 on
every gated route, and token-rotation (old token dies, new token works).

### 2.2 Mock Player

- [x] Player identity (`server/src/routes/session.ts` — `dev-player-N`, minted per launch)
- [x] Balance (`Session.balance`, `server/src/sessions.ts`)
- [x] Currency (`Session.currency`, `server/src/sessions.ts`)
- [x] Session state (`server/src/sessions.ts` `byToken` map)
- [x] Round history (`server/src/rounds.ts` `listCompleted`, `GET /api/game/history`)

No separate "player" record — a player is just the identity a `Session` carries
(one player : one session, minted together in `createSession`). Splitting them
would be an abstraction with no second consumer yet; add one if a real login
identity distinct from the session ever shows up.

### 2.3 Mock Round

- [x] Create round (`server/src/rounds.ts` `openRound`)
- [x] Accept bets (`server/src/routes/game.ts` `validateBets`, array of `{type, selection, amount}`)
- [x] Lock bets — implicit, not a separate step: `openRound` fixes `bets`/`outcome` together and there is no edit endpoint; `hasOpenRound` 409s any second `start` until the round completes (`round_already_started`)
- [x] Generate outcome (`server/src/rounds.ts` `generateOutcome` — flat placeholder, real math is milestone 3)
- [x] Resolve payout (`server/src/rounds.ts` `resolveBet`)
- [x] Update balance (`server/src/routes/game.ts` `adjustBalance` on start/complete)
- [x] Complete round (`server/src/rounds.ts` `settleRound`)

Landed as a byproduct of milestones 0/1, not new work this session — confirmed
against the code and covered by the existing `server/src/routes/game.test.ts`
suite (create → bets → outcome → payout → balance → history, plus
`round_already_started`/`round_already_completed` locking).

### 2.4 Development Controls

- [x] Force specific depth (`POST /api/debug/force-outcome { depth }`, `server/src/debug-state.ts` applied in `rounds.ts` `generateOutcome`)
- [x] Force specific fish (`force-outcome { fish }` — free string until the roster lands in milestone 3)
- [x] Force specific tier (`force-outcome { tier }`)
- [x] Force Kraken — not a separate endpoint: `force-outcome { depth: "trench", fish: "kraken", tier: "jackpot" }` (client helper `forceOutcome(...)`, a toolbar button later)
- [ ] Seeded outcomes — deferred to milestone 2.5; the provably-fair RNG (`server/src/rng.ts`) is the seed mechanism. Forced outcomes cover deterministic dev testing until then (ARCHITECTURE.md §17 treats `seed:` and `forcedFish:` as alternatives)
- [x] Reset player balance (`POST /api/debug/reset-balance { balance? }`, `server/src/sessions.ts` `resetBalances`)
- [x] Reset session (`POST /api/debug/reset-session` — wipes sessions + rounds + debug state; token dies, client re-launches)
- [x] Simulate server errors (`POST /api/debug/simulate { errorRate }`, injected in `server/src/http.ts`, `/api/debug/*` exempt)
- [x] Simulate network latency (`simulate { latencyMs }`, same injection point)
- [x] All debug controls gated by `VITE_DEBUG` (`src/constants/config.ts` `DEBUG`, `src/api/index.ts` debug helpers) / `/api/debug/*` (`server/src/routes/debug.ts` — routes only registered when `config.debugControls`, i.e. `NODE_ENV !== "production"`)

The `DebugToolbar` React component (ARCHITECTURE.md §4/§38) is **not** built this
milestone — there's no betting/round UI to attach it to yet. The controls are
exercised over HTTP (Swagger UI at `GET /docs`, or `src/api/index.ts` helpers);
the visual toolbar lands with the betting board (milestone 8).

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
