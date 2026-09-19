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
- [x] Bearer-token auth on every `/api/game/*` and `/api/seed/*` call (`server/src/sessions.ts` `requireSession`; `/api/seed/*` gated the same way — milestone 2.5)
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
- [x] `requireSession` middleware gates `/api/game/*` and `/api/seed/*` (`server/src/routes/seed.ts`, milestone 2.5)
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
- [x] Seeded outcomes — the provably-fair RNG (`server/src/rng.ts`) is the seed mechanism; every round's outcome is now derived deterministically from its `(serverSeed, clientSeed, nonce)` triple (milestone 2.5). Forced outcomes remain the alternative for pinning a specific fish/tier (ARCHITECTURE.md §17 treats `seed:` and `forcedFish:` as alternatives — a forced round won't verify)
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

- [x] `server/src/rng.ts` — HMAC-SHA256 byte stream over `(serverSeed, clientSeed, nonce)` + rejection-sampled `rollInt` (no modulo bias); `hashSeed`/`generateSeed` for the commit-reveal
- [x] Consume the stream to roll the outcome — `rounds.ts` `rollOutcome` draws depth from the stream now; fish/tier stay the flat placeholders until milestone 3 extends the same stream (`depth → fish → tier`)
- [x] `POST /api/seed/{current,upcoming,rotate,reveal}` (`server/src/seeds.ts`, `server/src/routes/seed.ts`) — `rotate` 409s (`round_in_progress`) while a round is open; `upcoming` pre-commits the next server seed hash
- [x] `POST /api/game/verify` — stateless recompute from `{ serverSeed, clientSeed, nonce }` (`server/src/routes/game.ts`); `seed` context now on round detail + history
- [x] Client helpers + wire types (`src/api/index.ts` `getSeed`/`getUpcomingSeed`/`rotateSeed`/`revealSeed`/`verifyOutcome`, `src/types/api.ts`); `server/openapi.yaml` updated

### Acceptance Criteria

The client can connect to the Mock Game Server and complete a full round without any client-side outcome generation, and a past round can be re-derived from its revealed seeds. — **met**: every round's outcome derives from its `(serverSeed, clientSeed, nonce)` triple; `POST /api/game/verify` reproduces it exactly from the seed revealed by `POST /api/seed/rotate` + `reveal`. Covered by `server/src/rng.test.ts` (7 cases — determinism, divergence, unbiased range) and `server/src/routes/seed.test.ts` (8 cases — the current/upcoming/rotate/reveal flow, rotate-blocked-mid-round, and a played round re-derived end-to-end through `verify`).

---

# 3. Authoritative Server Mathematics

### Goal

Implement the actual mathematical model on the server.

### 3.1 Outcome Generation

- [x] Define depth probabilities (`server/src/constants.ts` `DEPTH_WEIGHTS`)
- [x] Define fish probabilities (`server/src/constants.ts` `FISH[].weight`, relative within each depth)
- [x] Define outcome hierarchy — weighted depth → weighted fish in that depth → tier is the fish's roster tier (a lookup, not a roll) (`server/src/rounds.ts` `rollOutcome`)
- [x] Implement RNG — `server/src/rng.ts` `rollWeighted` (uniform int on the weight sum via `rollInt`, so no modulo bias), drawn from the existing provably-fair `byteStream`
- [x] Generate server-side outcome — `rollOutcome` consumes the seed stream (depth then fish); forced-outcome overlay unchanged; `POST /api/game/verify` re-derives it

Fish roster is `docs/GDD.md` FISH_GUIDE with its 8 `tierId`s folded onto the
wire's 5 (`junk→small`, `medium→large`, `rare→epic`). Probability weights are a
first pass — the structure is final, the values get tuned to the 96% RTP target
in 3.5 alongside the 3.3 payout table. Payout is still the flat 2.00x
placeholder (`rounds.ts` `PLACEHOLDER_MULTIPLIER_CENTS`) until 3.3. New unit
tests: `server/src/rounds.test.ts` (roster consistency + branch coverage),
`rollWeighted` cases in `server/src/rng.test.ts`.

### 3.2 Betting

- [x] Validate bets — `server/src/routes/game.ts` `validateBets`: type ∈ {depth,fish}, `depth` selection ∈ the 5 depth ids, `fish` selection ∈ the roster (`constants.ts` `FISH_IDS`, real as of 3.1), amount a positive 2dp decimal string within per-bet stake limits
- [x] Validate balance — total wager vs `session.balance`, `insufficient_balance` 400 (`routes/game.ts`, unchanged from milestone 1)
- [x] Lock bets — implicit: `openRound` fixes `bets`+`outcome` together, no edit endpoint
- [x] Prevent modification after lock — `hasOpenRound` 409s (`round_already_started`) any second `start` until the round completes
- [x] Per-bet stake limits (ARCHITECTURE.md §13) — `config.minBet`/`config.maxBet` (`DEV_MIN_BET`/`DEV_MAX_BET`, dev defaults `0.10`–`500.00`), enforced in `validateBets`

Lock / prevent-modification were already in place from milestones 1–2 (no
bet-edit endpoint exists). New work this milestone: fish selections now check
against the real roster instead of "any non-empty string", and per-bet
min/max stake limits are enforced. Limit violations reuse the `invalid_bet`
code (message carries the range). New `game.test.ts` cases: off-roster fish,
below-min, above-max. Payout is still the flat 2.00x placeholder until 3.3.

### 3.3 Payout

- [x] Resolve depth bets — `rounds.ts` `resolveBet`: win on `selection === outcome.depth`, pays `amount × DEPTH_MULTIPLIERS[selection]` (`constants.ts`)
- [x] Resolve fish bets — same function, win on `selection === outcome.fish`, pays `amount × FISH[].multiplier` (per-fish, not per-tier — same-tier fish have different weights so a per-tier multiplier would skew their EV)
- [x] Support multiple simultaneous bets — `openRound` maps `resolveBet` over every bet against the one outcome; each resolves independently (a depth + fish bet can both win)
- [x] Calculate total payout — sum of winning bets' payouts (`PayoutResult.total`), what `complete` credits
- [x] Calculate net result — `PayoutResult.net` = `total − wagered`, negative (leading `-`) on a losing round

Replaces the flat 2.00x `PLACEHOLDER_MULTIPLIER_CENTS`. Multipliers are a
first pass at ≈ `0.96 / P(selection)` — the **structure** (fixed table
multiplier per selection, depth table + per-fish column in `constants.ts`) is
final; the numbers get tuned with the probability weights to the 96% RTP
target in 3.5. `resolveBet` is now exported and pure — new
`server/src/rounds.test.ts` cases (depth/fish hit + miss, fractional
multiplier rounding, every-selection-pays-above-1x); new `game.test.ts` cases
(three simultaneous bets on one outcome, negative net on a loss); the
existing flat-2x happy-path assertions updated to the real shark ×28.
`src/types/api.ts` `PayoutResult.net` + `server/openapi.yaml` updated. The
client paytable mirror (`src/utils/game-math.ts`, ARCHITECTURE §37) is **not**
created yet — no paytable UI consumes it until milestone 21 / the betting
board; it lands then, mirroring `constants.ts`.

### 3.4 Balance

- [x] Deduct wager — `routes/game.ts` `start` debits `Σ bet.amount` via `sessions.ts` `adjustBalance(session, -wagered)` after `openRound` succeeds (so a debit never outlives a failed open)
- [x] Apply payout — `complete` credits `round.payout.total` via `adjustBalance` (`routes/game.ts`), then `settleRound`
- [x] Return authoritative balance — `GET /api/game/balance` and `POST /api/game/current` return `session.balance`; `/game/play`'s `metadata.balance` stays `"0"` by design (ARCHITECTURE §14 — not authoritative on multi-action responses)
- [x] Prevent duplicate payout — `complete` 409s (`round_already_completed`) once `round.status === "completed"`; handlers are synchronous start-to-settle so there's no check-then-act gap

Wallet mutation was already wired in milestone 1 and the payout figure went
real in 3.3 — this milestone's only code change is reordering `start` so
`openRound` runs before the debit. Covered by existing `game.test.ts` cases
(balance `990.00` after a `10.00` wager, `1272.40` after the `282.40` shark
payout; `round_already_completed` on a second `complete`). Shark's multiplier
is the 3.3 first pass (×28) retuned to the 96%-RTP value (×28.24) in 3.5.

### 3.5 Mathematical Testing

- [x] Unit tests — `server/src/math.test.ts`: `resolveBet` pays exactly
      `round(stake × table multiplier)` for every one of the 23 selections;
      losing bets still report the multiplier (exhaustive per-branch coverage
      stays in `rounds.test.ts`)
- [x] Probability tests — 200k-round simulation through the real `rollOutcome`;
      measured depth frequencies within 10% relative of `P(depth)`, fish within
      15% (wide enough for whale's `P≈0.0056` noise); `Σ P` checks
- [x] RTP simulation — multipliers retuned to `0.96 / P(selection)` (2dp) in
      `constants.ts`, so every selection's **theoretical** RTP is 96% ± 0.5%
      (asserted exactly); simulated blended RTP over the 200k stream is
      95–97.5%; the frequently-hit selections (`P ≥ 9%`) land within 2% of 96%
- [x] Combined bet tests — a depth + fish bet on one outcome resolve
      independently (both can win); a mixed slip's winners pay regardless of its
      losers; a `{reef, napoleon}` slip simulated over 200k rounds stays ~96%,
      confirming combining bets doesn't move RTP
- [x] Edge case tests — stake at `config.minBet` / `config.maxBet` on the
      largest multiplier; half-cent payouts round up (not banker's); an
      all-losing round nets `−wagered`; the rarest outcome (kraken) pays its
      exact multiplier; an off-table selection resolves to `0.00`, never `NaN`

Weight tables are unchanged — in this model each multiplier compensates for its
selection's probability, so weights set only hit-frequency / volatility, not
RTP (volatility targets are milestone 23). `openapi.yaml` payout examples and
the `rounds.test.ts` / `game.test.ts` assertions that pinned the 3.3 first-pass
multipliers (shark ×28 → ×28.24, etc.) were updated to the retuned values.

### Acceptance Criteria

The server can independently process a complete round and produce a
mathematically correct result. — **met**: `server/src/math.test.ts` (18 cases)
plus the existing `rounds.test.ts` / `game.test.ts` / `rng.test.ts` suites
(71 `node:test` cases total) prove outcome generation realises the weight
tables, every bet pays its tuned table multiplier, combined bets resolve
independently, and the simulated RTP converges on the GDD's 96% target.

---

# 4. Player Session & Client Synchronisation

### Goal

Make the client operate entirely from authoritative server state.

### 4.1 Session

- [x] Initialise session — `src/api/index.ts` `initSession()`: adopt a
      `?sessionToken=` from the launch URL → else restore a persisted token →
      else `createSession()`; always resolves to `POST /api/game/current`
      (balance + any resumable round)
- [x] Store session locally — token persisted to `localStorage`
      (`deepcatch.sessionToken`) by `setToken`, written on create / adopt /
      refresh; storage-disabled (private mode) degrades to in-memory only
- [x] Restore session — `initSession()` reloads the stored token and confirms
      it with `getCurrent()` before trusting it
- [x] Handle expired session — any 401 in `request()` clears the stored token
      (so the next `initSession()` mints fresh) and fires `onSessionExpired`
      (StoreSync → phase reset, unchanged); a stale restored token falls
      through to a fresh session, other errors propagate

Not wired into the app yet — the Loading Screen (milestone 5) calls
`initSession()`. New `src/api/index.test.ts` cases: token persists on create /
clears on 401, and `initSession` for the adopt / restore / expired-token /
no-token / non-401-failure paths.

### 4.2 Balance

- [x] Receive server balance — `src/stores/balanceStore.ts`: holds
      `balance` + `currency`, both verbatim from a server response. Its only
      mutator is `setBalance(balance, currency)` (whoever holds a
      `CurrentResponse`/`BalanceResponse`/settled round calls it)
- [x] Display balance — `src/components/Balance/`: HTML overlay (sibling of
      `<Application>`, §38), mounted for the `game` phase in `App.tsx`. Reads
      the store, formats with `Intl.NumberFormat`, renders nothing until the
      first figure arrives
- [x] Animate balance changes — `src/hooks/useAnimatedNumber.ts`: rAF cubic
      ease-out (~600ms) toward the changing target, retargeting from the
      on-screen value; renderer-free like `useCrossfade` (Rule 11).
      `tabular-nums` keeps the digits from jittering mid-count
- [x] Never locally calculate authoritative balance — the store has **no**
      delta/adjust action, only whole replacement; `Number()` in `Balance`
      is display-only and never fed back to the wire (Rule 3 / 6b)

Built as a unit with full unit coverage (`balanceStore.test.ts`,
`useAnimatedNumber.test.ts`, `Balance.test.tsx`) — nothing calls `setBalance`
in the running app yet, so the display stays dormant. The feed wires in at
milestone 5 (`initSession()` → `setBalance`), the same way §4.1 left
`initSession()` unwired for milestone 5. Round-driven debit/credit is §4.3.
No e2e: display-only, no interaction and no data until milestone 5. Skipped a
shared `formatMoney` util — one consumer today; extract when the betting
board (§8) needs it.

### 4.3 Round Synchronisation

- [x] Receive round ID — `src/stores/roundStore.ts`: `RoundSnapshot.roundId`,
      mirrored verbatim from the server's round response
- [x] Receive locked bets — `RoundSnapshot.bets` (`BetResult[]`, as locked and
      resolved server-side — §9 LOCK BETS → RESOLVE BETS)
- [x] Receive outcome — `RoundSnapshot.outcome` (`FishingOutcome`); the client
      never rolls it (Rule 2), only presents from it (§12)
- [x] Receive payout — `RoundSnapshot.payout` (`PayoutResult`); never computed
      client-side (Rule 3 / §15)
- [x] Receive final balance — through `balanceStore` (§4.2), not this store:
      `metadata.balance` on a round response is always `"0"` (§14), so the
      post-settle figure comes from `getBalance()` → `setBalance()`

`src/stores/roundStore.ts` is the round counterpart to §4.2's `balanceStore` —
a verbatim mirror of the authoritative round the client presents from, with one
whole-replacement mutator (`setRound`) and a `clearRound` for returning to
BETTING (§18). No derived state: outcome, payout and status are the server's
word. Built as a unit with unit coverage (`roundStore.test.ts`); nothing calls
`setRound` in the running app yet — the feed wires in with the betting
controller (milestone 8), and the resume path (`getCurrent` → `getRound` →
`setRound`) is §4.4. No e2e: no interaction and no data until then.

### 4.4 Failure Recovery

- [x] Reconnect — `src/components/system/roundRecovery.ts` `recoverFromServer()`:
      re-pulls authoritative state via `getCurrent()` and makes the stores
      match it; takes the `CurrentResponse` from `initSession()` on boot to
      skip a round-trip, fetches its own on a bare reconnect. `onSessionExpired`
      (StoreSync) → phase reset is the trigger side, unchanged
- [x] Recover active round — `getCurrent()` reports `active` → `getRound(id)`
      for full detail → `setRound()` with `status: "open"`; the presenting
      round's id is persisted (`deepcatch.roundId`, mirrors the session-token
      pattern in `src/api/index.ts`)
- [x] Recover completed round — a persisted `deepcatch.roundId` that
      `getCurrent()` no longer reports as active → `getRound(id)`; if it settled
      while the client was away (`status === "completed"`) it still loads into
      `roundStore` so the win isn't silently dropped
- [x] Handle interrupted animation — the resumed `RoundSnapshot.status` is the
      signal: `"open"` → play the fishing sequence out, `"completed"` → jump to
      payout. The presentation that reads it lands with §18; §4.4 carries the
      status through
- [x] Prevent duplicate requests — `src/api/index.ts`: `startRound` /
      `completeRound` route through one `play()` guarded by an in-flight flag,
      so a double-click or retry storm can't fire a second wager or completion
      (server still 409s duplicates — §31; this stops the request leaving the
      client)

`recoverFromServer()` and `setInflightRoundId()` sit in `roundRecovery.ts`
beside `StoreSync.tsx` — the same "no store imports `@/api`" layer (§7/§39),
split only so `StoreSync.tsx` stays component-only for fast-refresh. Nothing
calls `recoverFromServer()` in the running app yet — the Loading Screen wires
it after `initSession()` (milestone 5), and the betting controller calls
`setInflightRoundId()` when it opens a round (milestone 8). Unit coverage:
`roundRecovery.test.ts` (active / settled-while-away / stale-id / bare
reconnect), plus the in-flight-guard case in `src/api/index.test.ts`. No e2e:
no interaction and no data until milestone 5.

### Acceptance Criteria

Reloading the client does not create an inconsistent gambling state.

---

# 5. Loading Screen

### Goal

Create the game's initial presentation and asset loading pipeline.

### 5.1 Visual

- [x] Background — `src/assets/loading/background.svg`, full-bleed
      (`object-fit: cover`) behind the panel
- [x] Deep Catch logo — `src/assets/loading/logo.svg`, centred, gentle bob
- [x] Loading indicator — CSS spinner with `role="status"` / `aria-label`
- [x] Progress display — percentage text, `tabular-nums` so digits don't jitter
- [x] Loading animation — `spin` + `bob` keyframes; both drop under
      `prefers-reduced-motion: reduce`

`src/components/LoadingScreen/` is an HTML overlay, a sibling of
`<Application>` and never its child (§38), mounted for the `loading` phase in
`App.tsx`. Progress is a `ponytail` fake ramp (`useFakeProgress`) — §5.2
("Load required assets") replaces it with a `progress` prop fed by
`Assets.load`'s `onProgress` and deletes the hook. Unit coverage:
`LoadingScreen.test.tsx` (logo + indicator + 0% start, ramp advances, settles
at 100%). No e2e yet — §5.2 wires the real load, the session handshake and the
phase advance, so the loading-flow spec lands with it.

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

**Deferred — build last, after §28.** Keeps its number; built out of
sequence. Every milestone from §7 on reworks the betting board, the fishing
sequence and the harbour — a tutorial built now gets rewritten on each of
those passes. It also doesn't warrant the weight: this is a
target-selection gambling game, not a mechanics-heavy one.

**Reduced scope.** Not a guided, server-driven interactive walkthrough — a
short deck of static slides (one image + one line of copy each), shown once
on first load, skippable, with "don't show again". No tutorial round, no
controlled outcome, no UI gating.

The `loading → tutorial → game` phase machine keeps its middle state as a
harmless click-through placeholder until this lands; §5.2 may collapse it to
`loading → game` when it wires the real boot flow. Either way no §6 work
happens until the game is otherwise complete.

### 6.1 Slides (build last)

- [ ] Pick a depth and/or a fish — one slide
- [ ] Watch the cast & descent — one slide
- [ ] The catch — one slide
- [ ] Extraction & payout — one slide
- [ ] Skippable + "don't show again" (localStorage)

### Acceptance Criteria

A first-time player sees a short, skippable slide deck before their first
round, and never sees it again unless they clear storage.

_Original interactive-tutorial scope (guided UI, tutorial round, controlled
server outcome) is dropped unless an operator or regulator requires it._

---

# 7. Harbour / Main Hub

### Goal

Create the primary game environment.

### 7.1 Environment

- [x] Harbour
- [x] Dock
- [x] Ocean
- [x] Buildings
- [x] Lighting

`src/components/HarbourScene/` replaces the `game`-phase `PlaceholderScene`
in `App.tsx`. Each checklist item is a flat Pixi-drawn layer in `layers.ts`,
composed back-to-front (`sky → buildings → ocean → boats → dock → cranes →
props → lighting`). The art is placeholder — a real webp / skeleton asset
swaps in by replacing a layer's `draw` body without touching the layer
stack or z-order. Asset spec + open questions: `docs/ASSETS.md`.

Layers size off `app.screen`, so the placeholder holds at any aspect
(desktop / landscape / portrait). `layers.test.ts` locks the layer set,
z-order and §7.1 coverage, and runs every `draw` through a renderer-free
Graphics stub (Rule 11). No e2e: display-only environment backdrop, no
interaction — §7.2 fisherman and §7.3 ambient activity are the interactive
/ animated parts and are still open.

### 7.2 Fisherman

- [x] Character
- [x] Idle
- [ ] Fishing
- [ ] Reaction
- [ ] Victory

Animation pipeline: Blender → PNG sequence → packed sprite sheet, played by
Pixi `AnimatedSprite`. No skeletal runtime, no new dependency. Simple parts
(rod, cranes, boats) are code-transformed sprites, not sheets. Full spec +
frame budget: `docs/ASSETS.md`.

Character + idle landed as two flat placeholder stills in `src/assets/player/`
— `player.png` (boat, fisherman and rod as one image) and `hook.png` — no
Blender/sprite-sheet pass yet, still `docs/ASSETS.md` work.

Placeholder animation sheets have since landed beside them:
`player-idle-cast-reel.png` (cast, idle, reel, celebrate) and
`player-succes-fail.png` (battle, celebrate_big, disappointed, angry, sad), with
`player-animations.json` giving each clip's frames, fps, loop and what plays
next. `Fisherman` plays whichever clip `usePlayerStore` cues — idle by default.
Nothing in the game cues one yet, so the DEBUG panel's "Player" category is how
to see them. The sheets aren't on the grid the JSON describes — rows sit at
uneven heights, frames wander sideways and the second sheet is squashed ~15% —
so `playerFrames.ts` cuts each frame from measured positions and sets it in one
shared box (re-measure if the sheets are redrawn). `player.png` is no longer
used.

The screen is laid out in thirds (`src/components/HarbourScene/framing.ts`):
sky, city and docks in the top third (the background strip is placed so the
docks' waterline lands on `HORIZON_Y`); the boat and fisherman centred on the
harbour water in the middle third (`boatLayout`, drawn by
`Fisherman.tsx`, tinted with the day / night grade and bobbing on the existing
`waterSwell` helper); the underwater (`DescentScene`) in the bottom third.

The cast is a camera move through that one world, not a scene swap:
`HarbourScene` puts its layers in a container scrolled up by
`cameraScroll(depth)`, so the harbour slides off the top as the hook falls
from the rod tip into the water and the underwater takes the whole screen
(`CAST_METERS` of depth, ~1.5s at the default shallow speed). Ascending plays
it in reverse. `hook.png` and the line hang from the rod tip
(`src/components/DescentScene/FishingLine.tsx`), so the hook is visible on the
rod at idle. The hook loads with mipmaps, since it's drawn far smaller than its
source; the player sheets don't, being drawn larger than their 256px frames. The
line and hook hang from the idle pose's rod tip whichever clip is playing, so
casting will need a rod tip per frame.

### 7.3 Ambient Activity

- [ ] Helicopter
- [ ] Moving boats
- [ ] Workers
- [ ] Crane movement
- [ ] Birds
- [x] Water movement
- [x] Day/Night Cycle
- [ ] Jack pot sign

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
