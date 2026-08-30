# Deep Catch — Architecture

## 1. Architecture Goals

Deep Catch is a server-authoritative gambling game presented as an interactive fishing experience.

The architecture must support:

- Authoritative server-side gambling mathematics
- Player sessions
- Server-side balances
- Server-side RNG
- Server-side outcome generation
- Server-side payout calculation
- Multiple simultaneous bets
- Deterministic/reproducible development outcomes
- Reusable fishing presentation
- Modular scenes
- Data-driven fish, depths and payouts
- Easy replacement of placeholder assets
- Automated mathematical testing
- Mock server development
- Future integration with a production gambling platform

The central architectural principle is:

> **The client presents. The server decides.**

---

# 2. Trust Boundary

The client is an **untrusted presentation layer**.

The server is the **authoritative source of truth**.

The client must never be authoritative for:

- Player balance
- Bet validity
- RNG
- Outcome
- Payout
- Round completion
- Session validity

The client may control:

- UI
- Animation
- Rendering
- Camera
- Audio
- VFX
- Presentation timing

The client must not be able to alter the mathematical result through presentation code.

---

# 3. High-Level Architecture

```text
                         PLAYER
                           │
                           ▼
              ┌────────────────────────┐
              │         CLIENT         │
              │                        │
              │ React / UI             │
              │ Pixi Rendering         │
              │ Scenes                 │
              │ Animation              │
              │ Camera                 │
              │ Audio                  │
              │ VFX                    │
              └────────────┬───────────┘
                           │
                     API / Network
                           │
                           ▼
              ┌────────────────────────┐
              │     GAME SERVER        │
              │                        │
              │ Session                │
              │ Player State           │
              │ Betting                │
              │ Round                  │
              │ RNG                    │
              │ Outcome                │
              │ Payout                 │
              │ Balance                │
              └────────────┬───────────┘
                           │
                           ▼
              ┌────────────────────────┐
              │ RNG / CASINO PLATFORM  │
              │      (Production)      │
              └────────────────────────┘
```

During development:

```text
                         CLIENT
                           │
                           │ API
                           ▼
              ┌────────────────────────┐
              │    MOCK GAME SERVER    │
              │                        │
              │ Real API contract      │
              │ Real round lifecycle   │
              │ Real betting logic     │
              │ Real payout logic      │
              │ Development RNG        │
              │ Test controls          │
              └────────────────────────┘
```

The Mock Game Server exists to reproduce the **interface and behaviour** of the future server, not to move gambling logic into the client.

---

# 4. Project Structure

There is **no shared package and no `src/client` / `src/server` split**. The
client is a flat, type-organised `src/` tree (a thin presentation client). The
mock game server is a sibling `server/` directory at the repo root. The only
"shared" code is the wire-type file the client owns (`src/typings/api.ts`) and
the deliberately-duplicated payout table (see §37); the mock server mirrors both
and tracks the contract doc (`docs/BACKEND.md`).

```text
src/                        thin presentation client
│
├── api/
│   └── index.ts            the ONLY file that knows the wire envelope (§7)
├── assets/                 fish, harbour, boats, machinery, ui, vfx, audio
├── components/
│   ├── game/               Pixi scene content (ocean, fishing, fish, extraction)
│   ├── screens/            loading, tutorial, harbour, payout
│   ├── ui/                 betting board, HUD, history, game-info, modals
│   ├── system/             headless controllers + StoreSync (§18, §39)
│   └── debug/              forced-outcome tools, gated by VITE_DEBUG
├── stores/                 Zustand presentation state
├── data/                   static presentation config (fish, depths, tiers)
├── hooks/
├── utils/
│   └── game-math.ts        mirrors server/src/constants.ts payout table (§37)
├── typings/
│   ├── base.ts             → @typings
│   └── api.ts              → @typings/api   (the wire contract)
├── styles/
├── App.tsx                 mounts one <Application>; runs the phase machine
├── constants.ts
└── main.tsx

server/                     mock game server — a real HTTP service, not a stub
└── src/
    ├── index.ts            gates /api/game/* with requireSession
    ├── operator-auth.ts    HMAC signing for /operator/launch
    ├── sessions.ts
    ├── rng.ts              HMAC-SHA256 seed stream (provably fair, §36)
    ├── constants.ts        probabilities + payout table (authoritative)
    ├── debug-state.ts      forced outcomes / seeded outcomes
    └── routes/
        ├── session.ts      POST /api/session
        ├── operator.ts     POST /operator/launch
        ├── game.ts         play, current, round, history, balance, verify
        └── seed.ts         current, rotate, reveal, upcoming
```

Path aliases (`@typings`, `@typings/api`, `@/…`) are declared in **both**
`tsconfig.json` and `vite.config.js` — add a new alias to both or the build
breaks. List `@typings/api` before the bare `@typings`.

---

# 5. Wire Contract

Every game action goes through **one endpoint**: `POST /api/game/play`. The body
is `{ "message": { <oneVariant>: {...} } }` and the response is
`{ "message": <Result>, "roundId": "…" }`. `message` is a discriminated union —
set exactly one variant. Variants for Deep Catch:

```text
start       place bets + open the round (server generates the outcome now)
complete    acknowledge presentation finished, settle the round
```

Read-only endpoints are fixed and never name the game (the session is scoped to
one player + game + currency):

```text
POST /api/game/current        balance + any in-progress round to resume (§30)
GET  /api/game/round/{id}      full detail for one round
GET  /api/game/history         recent completed rounds
GET  /api/game/balance         authoritative live balance
POST /api/game/verify          recompute a past outcome from its seeds (§36)
POST /api/seed/{current|rotate|reveal|upcoming}
```

Wire rules:

- Field names are `camelCase`.
- **Money is always a decimal string** (`"1.00"`), never a float.
- Zero-valued fields are emitted, not omitted.
- Failed actions return a non-2xx status with a structured error body, not a `Result`.
- The client's copy of these types lives in `src/typings/api.ts` (`@typings/api`).
  The mock server mirrors the same shapes and tracks `docs/BACKEND.md`. There is
  no shared package — they are kept in sync by hand.

Example shapes:

```ts
interface StartMessage {
	bets: Bet[]; // Bet.amount is a decimal string
}

interface Bet {
	type: "depth" | "fish";
	selection: string;
	amount: string;
}

interface RoundResult {
	roundId: string;
	outcome: FishingOutcome; // { depth, fish, tier }
	bets: BetResult[];
	payout: PayoutResult; // decimal strings
	metadata: { balance: string }; // NOT authoritative on multi-action responses — see §14
}
```

---

# 6. Player Session

A player session is established with the server before normal gameplay begins.

Conceptually:

```text
CLIENT
   ↓
CREATE / JOIN SESSION
   ↓
SERVER
   ↓
SESSION CREATED
   ↓
CLIENT INITIALISED
```

The session contains authoritative player state.

```ts
interface GameSession {
	sessionId: string;
	playerId: string;
	currency: string;
	balance: number;
}
```

The client may cache the session identifier where appropriate, but the server remains authoritative.

---

# 7. Client API Layer — the single wire boundary

`src/api/index.ts` is the **only** file in `src/` that knows the
`{ message: { … } }` envelope exists. Nothing else — no store, no component,
no controller — sees a wire shape. That file owns:

- Session bootstrap, the bearer token, the refresh timer, and exactly one 401
  retry (`authFetch`).
- `onSessionExpired`, consumed by `components/system/StoreSync.tsx`, so no store
  imports the API layer to hear about it.
- **Adapters that hide wire quirks.** Callers get plain typed functions:

```ts
api.createSession();
api.getBalance();
api.startRound(bets); // wraps { message: { start: { bets } } }
api.completeRound(roundId); // wraps { message: { complete: { roundId } } }
api.getCurrent(); // resume on boot
api.getHistory();
```

- The two-vocabulary conversion (UI strings ↔ wire enums for tier/depth codes)
  happens **here and nowhere else**.

UI components and controllers call these helpers; they never call `fetch`, and
they never construct or read a `message` envelope.

```text
Betting UI → Betting controller → api.startRound() → [envelope] → Server
```

Add any wire-level change in `src/api/index.ts`, not in the stores or components.

---

# 8. Server API

See §5 for the full endpoint list. The shape of it:

- `POST /api/session` — **unauthenticated**. Bootstraps a session (§35).
- `POST /api/game/play` — every game action, via the `message` union.
- `POST /api/game/current`, `GET /api/game/{round/:id, history, balance}`,
  `POST /api/game/verify`, `POST /api/seed/*` — reads and provably-fair.

`server/src/index.ts` gates `/api/game/*` and `/api/seed/*` with
`requireSession` (bearer token). `/api/debug/*` stays open and is gated by
`VITE_DEBUG` on the client instead.

Transport is HTTP. The client depends only on the typed helpers in
`src/api/index.ts`, not on the transport.

---

# 9. Round Lifecycle

The server owns the round lifecycle.

```text
CREATE ROUND
     ↓
ACCEPT BETS
     ↓
VALIDATE BETS
     ↓
LOCK BETS
     ↓
GENERATE OUTCOME
     ↓
RESOLVE BETS
     ↓
CALCULATE PAYOUT
     ↓
UPDATE BALANCE
     ↓
RETURN RESULT
     ↓
ROUND COMPLETE
```

The client receives the result and begins presentation.

---

# 10. Mathematical Authority

All gambling mathematics executes on the server.

The server controls:

- Probability tables
- RNG
- Outcome selection
- Bet validation
- Payout calculation
- RTP
- Balance changes

The client does not contain an alternative implementation of the gambling math.

The client may contain **display configuration** such as:

```text
Fish name
Fish image
Depth visual
Animation
Extraction tier
```

but these are presentation concerns.

---

# 11. Outcome Generation

The outcome is generated by the server before presentation begins.

Conceptually:

```ts
const outcome = outcomeGenerator.generate();
```

The result may be:

```ts
{
    depth: "deep",
    fish: "shark",
    tier: "epic"
}
```

The client receives this result from the server.

The client never calls its own RNG to determine the fish.

---

# 12. Outcome vs Presentation

This is one of the most important architectural boundaries.

### Server

Determines:

```text
SHARK
DEEP
EPIC
25x
```

### Client

Presents:

```text
Cast
 ↓
Descent
 ↓
Shark approaches
 ↓
HOOK!
 ↓
Ascent
 ↓
Crane
 ↓
Win
```

The presentation sequence cannot change the outcome.

---

# 13. Betting Architecture

The client owns the **betting interface**.

The server owns **bet validation**.

Flow:

```text
PLAYER
  ↓
Betting UI
  ↓
Client validation
  ↓
API request
  ↓
Server validation
  ↓
Bets accepted/rejected
```

Client-side validation exists for responsiveness and UX.

Server-side validation is authoritative.

The server must independently verify:

- Session
- Balance
- Bet amount
- Bet type
- Selection
- Round state
- Currency
- Maximum/minimum limits

---

# 14. Balance Architecture

The server owns the player's balance.

The client displays the balance received from the server.

Incorrect:

```ts
balance -= wager;
balance += payout;
```

as an authoritative operation.

Correct:

```text
CLIENT
  ↓
Place wager
  ↓
SERVER
  ↓
Validate
  ↓
Update balance
  ↓
Return authoritative state
  ↓
CLIENT
  ↓
Animate displayed balance
```

The client may optimistically animate UI where appropriate, but the server remains the source of truth.

**`metadata.balance` is not the balance.** On multi-action `/game/play`
responses the server skips the wallet lookup and returns `"0"`. Track the
balance client-side (adjust locally as the round debits the wager and credits
the payout) and read the authoritative value from `GET /api/game/balance`.

---

# 15. Payout Architecture

Payout calculation occurs exclusively on the server.

The server receives:

```text
Bets
+
Authoritative outcome
```

and produces:

```text
Winning bets
Losing bets
Individual returns
Total payout
Final balance
```

The client receives the result and presents it.

---

# 16. Mock Game Server

The Mock Game Server exists specifically for development.

It should implement the same external contract as the production server.

It should support:

- Mock sessions
- Mock players
- Mock balances
- Real betting logic
- Real payout logic
- Development RNG
- Forced outcomes
- Seeded outcomes
- Round history
- Simulated latency
- Simulated errors

Example development control:

```text
Force Outcome

SHALLOW
REEF
DEEP
ABYSS
TRENCH

Force Fish

SARDINE
BLUEFIN TUNA
SHARK
WHALE
KRAKEN
```

These controls exist only in development.

---

# 17. Deterministic Development

The server should support deterministic outcomes during development.

Conceptually:

```ts
generateOutcome({
	seed: "test-kraken"
});
```

or:

```ts
generateOutcome({
	forcedFish: "kraken"
});
```

This allows the complete Kraken presentation to be tested immediately.

The client must not contain a hidden development RNG.

---

# 18. Client Game State

The client has a presentation state machine:

```text
LOADING
   ↓
TUTORIAL
   ↓
BETTING
   ↓
CAST
   ↓
DESCENT
   ↓
ENCOUNTER
   ↓
ASCENT
   ↓
EXTRACTION
   ↓
PAYOUT
   ↓
BETTING
```

The server has its own authoritative round state.

These are related but should not be treated as the same state machine.

For example, the client may be:

```text
EXTRACTION
```

while the server already considers the round:

```text
RESOLVED
```

The client is simply presenting the resolved result.

---

# 19. Fishing Sequence

The fishing sequence receives a server-authoritative outcome.

```ts
await fishingSequence.play(roundResult.outcome);
```

Conceptually:

```text
CastSequence
      ↓
DescentSequence
      ↓
EncounterSequence
      ↓
AscentSequence
      ↓
ExtractionSequence
      ↓
PayoutSequence
```

The sequence controller orchestrates presentation.

It does not generate gameplay outcomes.

---

# 20. Depth System

Depths are shared domain identifiers but have separate mathematical and visual configuration.

```ts
type DepthId = "shallow" | "reef" | "deep" | "abyss" | "trench";
```

The server may use depth probabilities.

The client uses depth configuration for:

- Environment
- Lighting
- Particles
- Music
- Ambient fish
- Fog
- Visual effects

Mathematical configuration should not be exposed unnecessarily to the client.

---

# 21. Fish System

Fish definitions should be data-driven.

```ts
interface FishDefinition {
	id: FishId;
	name: string;
	depth: DepthId;
	tier: FishTier;
	image: string;
	wide?: boolean;
}
```

The server uses fish identifiers for mathematical outcomes.

The client uses those identifiers to find presentation assets.

Example:

```text
Server:
    fish = "shark"

Client:
    FISH.shark
```

The client must not infer the outcome from asset availability.

---

# 22. Extraction System

Extraction is a presentation system driven by the authoritative outcome.

```text
Fish Tier
    ↓
Extraction Tier
    ↓
Presentation
```

Example:

```text
Small
  → Rod

Large
  → Winch

Epic
  → Crane

Legendary
  → Heavy Crane

Jackpot
  → Helicopter / Ultimate
```

The server determines the outcome/tier.

The client determines how that tier is visually presented.

---

# 23. Kraken / Trench

The Kraken remains a normal authoritative outcome from the server:

```ts
{
    depth: "trench",
    fish: "kraken",
    tier: "jackpot"
}
```

The client may then execute a unique presentation:

```text
Darkness
 ↓
Tentacle
 ↓
Eye
 ↓
Hook
 ↓
Struggle
 ↓
Ascent
 ↓
Harbour reaction
 ↓
Ultimate extraction
```

The Kraken sequence contains no gambling logic.

---

# 24. Event Architecture

Events communicate presentation and game lifecycle changes.

Examples:

```text
SESSION_READY
ROUND_CREATED
BETS_SUBMITTED
BETS_LOCKED
OUTCOME_RECEIVED
CAST_STARTED
DEPTH_REACHED
FISH_APPROACHING
FISH_HOOKED
ASCENT_STARTED
SURFACE_REACHED
EXTRACTION_STARTED
CATCH_REVEALED
PAYOUT_DISPLAYED
ROUND_COMPLETE
```

Server events and client presentation events should remain conceptually separate.

---

# 25. Camera

The camera is purely presentation.

It may:

```ts
camera.follow(hook);
camera.focus(fish);
camera.shake();
camera.panTo(surface);
camera.followExtraction();
```

Camera state must never influence the game result.

---

# 26. Ocean

The ocean is a reusable presentation system.

Layers may include:

```text
Background
Depth Gradient
Lighting
Caustics
Particles
Bubbles
Debris
Ambient Fish
Fog
VFX
```

Depth configuration controls presentation.

The server does not need to know how the ocean is rendered.

---

# 27. Asset Architecture

Assets are presentation-only.

Gameplay code should reference assets through a central manifest.

```ts
ASSETS.fish.shark;
ASSETS.fish.kraken;
ASSETS.harbour.crane;
ASSETS.machinery.helicopter;
```

Raw asset paths should not be scattered throughout gameplay code.

Replacing artwork should not require modifying gambling logic.

---

# 28. Audio

Audio responds to client-side events.

Example:

```text
FISH_HOOKED
    → Hook impact

EXTRACTION_STARTED
    → Machinery

PAYOUT_DISPLAYED
    → Win sound
```

Audio does not determine game state.

---

# 29. Round History

Round history is authoritative server data.

The server stores or retrieves:

```text
Round ID
Bets
Outcome
Depth
Fish
Multiplier
Payout
```

The client formats and displays this information.

---

# 30. Failure & Recovery

Network failure must not create an ambiguous gambling state.

On every boot (and after a reconnect) the client calls `POST /api/game/current`:

```text
Client (re)loads
       ↓
POST /api/game/current
       ↓
{ active: false }              → nothing to resume, go to betting
{ active: true, roundId, state } → resume presentation from that round
```

The returned `state` is **client-safe** — fields that would leak the outcome
(e.g. the full fish/depth roll) are withheld while the round is still open. The
client must never assume "the request probably worked"; `current` is the
authoritative answer.

The client must never assume:

> "The request probably worked."

The server must provide the authoritative answer.

---

# 31. Idempotency & Duplicate Protection

Gambling operations must protect against duplicate requests.

Important operations should have unique request/round identifiers.

Examples:

```text
requestId
roundId
sessionId
```

The server must prevent:

- Duplicate wager
- Duplicate round
- Duplicate payout
- Duplicate completion

---

# 32. Security Principles

The server assumes the client is untrusted.

Never trust client-provided:

- Balance
- Payout
- Outcome
- RNG result
- Win amount
- Round completion state

The client may request an operation.

The server decides whether that operation is valid.

---

# 33. Testing Architecture

## Server Tests

Test without the client or renderer:

- Session creation
- Bet validation
- Outcome generation
- RNG
- Payout
- Balance
- RTP
- Round lifecycle
- Duplicate requests

## Client Tests

Test:

- Scene transitions
- UI behaviour
- Animation sequences
- Fish presentation
- Depth transitions
- Extraction
- Audio events

## Integration Tests

Test the real flow:

```text
Client
 ↓
Mock Server
 ↓
Session
 ↓
Bet
 ↓
Outcome
 ↓
Client Fishing Sequence
 ↓
Payout
 ↓
Updated Balance
```

---

# 34. Production Server Integration

The Mock Game Server should implement the same API contract as the production server.

The desired architecture is:

```text
              ┌───────────────┐
              │    CLIENT     │
              └───────┬───────┘
                      │
              Shared API Contract
                      │
             ┌────────┴────────┐
             │                 │
             ▼                 ▼
      MOCK GAME SERVER    PRODUCTION SERVER
             │                 │
             │                 ▼
             │          CASINO PLATFORM
             │
       Development
       RNG / Math
```

The client should not care whether it is communicating with the Mock Game Server or the Production Server.

Only the API endpoint/environment configuration should change where possible.

---

# 35. Session & Operator Launch

Session creation mirrors a real RGS operator handshake:

```text
CLIENT
  ↓  POST /api/session   (unauthenticated)
MOCK SERVER
  ↓  HMAC-SHA256 signs a real HTTP round-trip to POST /operator/launch
  ↓  (X-Operator-ID, X-Timestamp, X-HMAC-SHA256 headers)
  ↓  → sessionToken
CLIENT
  ↓  Authorization: Bearer <sessionToken>  on every /api/game/* and /api/seed/* call
```

- The HMAC secret is server-side only and never reaches the browser.
- The session is scoped to one **player + game + currency** — which is why
  `/api/game/*` requests never name the game.
- A launch URL may carry `?sessionToken=…`; the API layer adopts it and strips
  it from the address bar.
- Tokens expire on inactivity. `POST /api/session/refresh` rotates the token;
  each token refreshes at most once. The refresh timer lives in `src/api/index.ts`.

---

# 36. Provably-Fair RNG

The outcome derives deterministically from a **server seed** (committed as a hash
before play, revealed after rotation), a **client seed**, and a **nonce** that
increments per round.

```text
server/src/rng.ts:  HMAC-SHA256 byte stream over (serverSeed, clientSeed, nonce)
                    → consumed to roll depth, then fish, then tier
```

- `POST /api/seed/rotate { clientSeed }` — player-set, blocked while a round is open.
- `POST /api/seed/reveal` — reveals the previous server seed for auditing.
- `POST /api/game/verify { seed, message }` — recomputes a past outcome from its
  seed triple. Same inputs → same outcome, every time. That is the proof.

The client never runs this RNG. It has no hidden development RNG (§17).

---

# 37. Deliberate Payout-Table Duplication

`src/utils/game-math.ts` **intentionally mirrors** the payout multipliers in
`server/src/constants.ts` (the fish/tier → multiplier table). The client needs
its own copy to render the paytable and the fish guide before any round is
played.

- Duplicate **only the payout table**. Never duplicate the probability tables —
  those stay server-only (§20).
- **Change one file and you must change the other.** A divergence here means the
  displayed paytable lies.

---

# 38. Rendering Split

`App.tsx` mounts exactly **one** `<Application>` (`@pixi/react`). It holds the
scene graph — ocean, hook, fish, harbour, extraction. **Every HTML overlay**
(betting board, HUD, pop-ups, modals, debug toolbar) is a **sibling of the
canvas, not a child of it**.

`App.tsx` runs a phase machine — `loading → tutorial → game` — that advances to
`game` only after **both** the asset load has finished **and** Pixi has rendered
its first non-empty frame.

---

# 39. State & Headless Controllers

- Zustand stores live in `src/stores/` and hold **no cross-store
  subscriptions**.
- All cross-store effects live in one file: `src/components/system/StoreSync.tsx`.
- Multi-round sequences (autoplay, auto-bet) are driven by **headless
  controllers** in `src/components/system/` that render `null` and act through
  the stores.

---

# 40. Architectural Rules for AI Development

### Rule 1

Never implement gambling logic in the client.

### Rule 2

Never generate the authoritative outcome in the client.

### Rule 3

Never calculate the authoritative balance in the client.

### Rule 4

Never allow an animation to determine an outcome.

### Rule 5

Never make UI components responsible for network communication.

### Rule 6

Only `src/api/index.ts` knows the wire envelope. Stores and components never
touch a `message` shape, call `fetch`, or convert UI↔wire vocabularies.

### Rule 6b

Money crosses the wire as a decimal string, never a float.

### Rule 6c

Duplicate the payout table if the paytable UI needs it; never duplicate the
probability tables. If duplicated, change both copies together.

### Rule 7

The Mock Game Server must behave like a real server.

### Rule 8

Do not bypass the API during development simply because a direct function call is easier.

### Rule 9

Before modifying an existing system, inspect its dependencies.

### Rule 10

Do not introduce new dependencies without justification.

### Rule 11

Keep domain logic testable without rendering.

### Rule 12

Complete the current milestone before starting unrelated work.

---

# 41. Architectural North Star

The architecture should allow the following independently:

### Change the server mathematics

Without changing:

- Fishing animation
- Fish artwork
- Harbour
- UI presentation

### Change the fishing animation

Without changing:

- RNG
- Bets
- Payout
- Server logic

### Change fish artwork

Without changing:

- Server outcome
- Betting
- Payout

### Add a fish

Primarily by adding:

- Server configuration
- Shared fish ID
- Client asset
- Presentation configuration

### Replace Mock Server

Without fundamentally rewriting the client.

### Replace Production Server

Without fundamentally rewriting the presentation.

The final system should behave as though the client is a **cinematic game client attached to an authoritative gambling engine**.

The player experiences a fishing game.

The server operates a gambling game.

The architecture keeps those two responsibilities separate.
