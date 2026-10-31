# Hooked — Simulated Rounds

_Debug-gated hook control → recorded runs in SQLite → a provably-fair replay of every round._

## 1. Context

Today the descent is decoration. The server already decides every round
(`rollOutcome` in `server/src/rounds.ts`: HMAC seed → depth → fish), but on the
client the hook sweeps on three summed sine waves of wall-clock time
(`src/components/descent-scene/lineDrift.ts`), the fish loop across the screen on
the same clock (`Creatures.tsx`), and nothing is ever caught — `useDescentDepth`
runs down, holds for the Kraken at the bottom, and reels back up.

This plan replaces that with a small **deterministic fishing sim**. Every round a
player watches is a _recorded run_ of it, and the run ends with the pre-determined
fish on the hook. Steering exists only in the debug menu, as the tool for building
and testing the sim.

**Non-negotiables** (from the request, `docs/JACKPOT.md`, ARCHITECTURE §12/§40):

1. Production play is unchanged: the player watches and never steers; the outcome
   comes from `rollOutcome` and nothing else.
2. The sim can _depict_ an outcome, never _decide_ one — payout and RTP cannot move.
3. Manual control is a debug sandbox: it never opens a round, touches balance, or
   reaches the server as an outcome.
4. `auto` (today's descent) stays the default and the fallback until replays are proven.

**Terminology.** The request's "extraction" (hook touches a mouth → reel in) is
BUILD_PLAN §14–15 (impact + ascent). The harbour crane/helicopter spectacle
(§16) starts when the sim reports SURFACED; nothing here replaces it.

**Decided:** a recording stores `worldSeed` + the per-tick input stream (not full
paths), and the library keeps a quota of playable recordings per fish plus counters
for every game simulated.

## 2. Design at a glance

| Decision         | Choice                                                                                                                 | Why                                                                                                           |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Sim code         | One deterministic core, `src/utils/sim*.ts`, imported by the client **and** by `server/` unbundled                     | A physics sim can't be hand-mirrored the way the payout table is (ARCHITECTURE §37); Node runs the same `.ts` |
| Recording        | `worldSeed` + per-tick input stream, run-length coded                                                                  | ≈0.1–2 KB a game; hook path and fish paths re-derive exactly; a run can be re-simulated to prove it           |
| Fish paths       | Closed-form of the tick (`x = f(tick)`), not stepped                                                                   | Random access, no per-tick fish state, reproducible from a seed, bots can plan intercepts                     |
| Outcome ↔ visual | Recordings bucketed by the fish they hook; the server picks the bucket from `outcome.fish` and the index from the seed | The visual cannot disagree with the payout                                                                    |
| Storage          | SQLite through built-in `node:sqlite` (Node 24; CI is on 24) — no new dependency                                       | ARCHITECTURE Rule 10; millions of rows are fine                                                               |
| Modes            | `hookMode`: `auto` (default, today) / `manual` (debug) / `replay`                                                      | Original gameplay untouched until replay is proven                                                            |

```text
 OFFLINE                                 PER ROUND (server)                    CLIENT
 bots ────┐                              rollOutcome(S,C,n) ─► fish f
          ├─► sim core ─► library.sqlite roll(S,C,n,"replay") ─► index i       replay mode:
 human ───┘   (shared)    bucketed by    library[f][i] ─► recording ──────────► sim(recording)
 (debug)                  fish, frozen        │                                     │
                               │              └─ libraryHash (committed           ▼
                               ▼                 before play)                 Pixi scene, ends with
                          libraryHash                                         fish f on the hook

 DEBUG MENU:  manual mode ─► the same sim core, live ←/→ keys ─► sandbox (no round, no balance)
```

**Request → phase.** Arrow keys → 1. Hook by the mouth → 2. Reel-in → 3. Record
hook/fish paths + fish count in SQL → 4. Re-run a round → 5. "Simulate millions" → 6.
Provably fair → 7. Real rounds → 8. Phase 0 is groundwork.

## 3. The simulation

### 3.1 Ground rules for `src/utils/sim*.ts`

- **Pure and isomorphic.** No `pixi.js`, React, DOM or asset imports.
  (`constants/fish.ts` names its sheets with `new URL(..., import.meta.url)` — a plain string under Node — so the sim can read it.)
- **Imports are `./sibling.ts` only, with the explicit extension.** Node can't
  resolve the `@utils`-style aliases and ESLint bans `../` inside `src/`. This is
  why the whole core is one flat directory with a `sim` prefix.
- **Erasable TypeScript only** (no `enum`, `namespace`, parameter properties) —
  Node runs it by type-stripping, as it already does for `server/`.
- **Deterministic.** Fixed 60 Hz integer tick; no `Math.random`, `Date`,
  `performance.now`; arithmetic limited to `+ − × /`, `%`, `Math.floor` and
  comparisons — never `sin/cos/pow/exp/hypot` (engines may differ), squared
  distances instead of `sqrt`. That is what keeps the same inputs giving the same
  bits in V8, SpiderMonkey and JSC; the golden test checks it (§10).
- **Versioned.** `SIM_VERSION` bumps whenever a rule, constant, species or mouth
  changes a trajectory; the golden-trajectory test fails until it does.

| File              | Holds                                                                                                            |
| ----------------- | ---------------------------------------------------------------------------------------------------------------- |
| `simConfig.ts`    | `SIM_VERSION`, `TICK_HZ` (60), `SIM_WIDTH` (1920), hook + phase constants, frozen depth/speed table              |
| `simRandom.ts`    | mulberry32, lifted out of `creatureSpecies.ts` (which imports it back — no behaviour change)                     |
| `simWorld.ts`     | `spawnWorld(worldSeed)`, `fishX(fish, tick)`, `mouthAt(fish, tick)`                                              |
| `simStep.ts`      | `createSim`, `step(sim, axis)` (the server re-runs inputs itself, in `recordings.ts`)                            |
| `simRecording.ts` | `Recording`, run-length codec, canonical bytes, base64; state hash (FNV-1a over float bits) with the golden test |

`simConfig.ts` is a **frozen snapshot** of today's numbers (zone starts, speeds,
`PX_PER_METER`, `CAST_METERS`, the ascent speed). A drift-guard test compares it
with `depthZones.ts`/`useDescentDepth.ts`, so retuning the auto scene or the debug
sliders can't silently change what a stored recording means.

### 3.2 State and phases

```text
DESCEND ─ mouth touched ──► HOOKED ─ ~0.5 s ──► REEL ─ depth 0 ──► SURFACED
   │                                              ▲
   └─ depth = MAX_DEPTH_METERS ──► KRAKEN ─ 8 s ──┘
```

State: hook `{ x, vx, depthM }`, `phase`, `hooked` (fish index), `tick`. Fish are not stepped.

- **DESCEND** — depth advances on the per-zone speed table with the same
  deceleration into `MAX_DEPTH_METERS` that `useDescentDepth` has. Steering:
  `vx = (vx + axis·ACCEL·dt)·DRAG`, clamped to ±`MAX_VX`; `x` clamped to the screen.
  Numbers tuned by feel in Phase 1 (target: edge to edge in ≈1.5 s).
- **HOOKED** — hook freezes, the fish snaps mouth-to-hook and plays its bite clip
  (every sheet in `animations.json` has a bite row 2 and a struggle row 3), then → REEL.
- **REEL** — depth falls at the fixed ascent speed (600 m/s today); steering is
  ignored; the fish rides the hook.
- **KRAKEN** — reaching the bottom hooks the Kraken with no mouth test (the
  jackpot layer's only fish; JACKPOT.md: "the Kraken hooked you"). The 8 s fight
  (`KRAKEN_FIGHT_SECONDS`) is counted in ticks, then → REEL.
- **SURFACED** — `result = { fish, depthM, ticks }`; `fish` is a roster id, and
  its `DepthId` is looked up from the roster.

**Rules the request didn't state** (defaults — they only affect the sandbox and
which runs get recorded, change freely): the first mouth touch hooks, no second
chance; steering is locked from HOOKED onward; the hook can't leave the screen;
mouth tests are armed only from `CAST_METERS` (300 m, once the cast blend is over);
reaching the bottom always hooks the Kraken.

### 3.3 Fish world

`spawnWorld(worldSeed)` reuses `spawnCreatures`' slicing (each species' depth band
cut into `count` slices, one fish per slice), so today's 61 fish are the default
world and a `worldSeed` alone fixes every fish's depth, direction, speed and start
offset. Each cruises horizontally at its own depth and wraps:
`x = (tick/60·speed + offset) mod (SIM_WIDTH + width)`.

Richer paths (vertical wander, fish reacting to the hook) would be one function
plus a `SIM_VERSION` bump.

### 3.4 Mouth hits

Each species carries `mouth = { x, y, r }` as fractions of its 256-px sprite cell,
relative to the centre, for the left-facing art (mirrored when `direction = 1`).
"Mouth" is the contact point — a claw for the crab, the bell for the jellyfish. Seed
it from the art's left edge, then tune it with the hit-box overlay (Phase 2).

The hook tip is a point with radius `HOOK_R` at a fixed offset below the line end.
Each tick checks only fish within a small depth window of the hook (squared
distance); first touch wins, ties go to the lowest fish index. One static mouth per
species — per-frame mouths only if it feels unfair. Per-tick movement is small next
to the combined hit radius (tens of px), so no swept test is needed; add one if
`MAX_VX` or a fish speed ever approaches it.

### 3.5 Roster coverage

The server has 26 fish ids; the client has one sheet per species in `src/assets/fish-sprites/`, not per id
(`mackeral.png`, `pike.png`, `crab.png`, `neoplean.png`). `animations.json` already
describes sheets whose PNGs aren't in `src/assets/fish-sprites/` yet (marlin,
blue-reef-fish, starfish, parrotfish).

`HOOKABLE_FISH` (`constants/fish.ts`, the single fish table) is keyed by **roster id** with its `art` sheet. A test
asserts every id in `src/constants/fish.ts` (the client mirror of
`server/src/constants.ts`) is hookable. A roster id with no art needs a
stand-in — see §11.

## 4. Controls (debug-gated)

- **Arrow keys.** `useHookKeys` keeps a set of held ArrowLeft/ArrowRight, ignores
  `event.repeat`, clears on `blur`/`visibilitychange`, and ignores events from
  inputs/selects/textareas or while the debug `<dialog>` is open (the panel's number
  inputs use the arrows). The axis (right − left) is sampled once per tick, never
  per event, so it is exactly what gets recorded.
- **Runner.** `useHookSim` is an rAF loop with a fixed-step accumulator (frame dt
  clamped to 250 ms so a background tab can't cause a catch-up burst) and one
  `setState` per frame, like `useDescentDepth`. Input is keys (manual) or a
  recording (replay). Debug `timeScale` ×1/×2/×4/×8 just runs more ticks per frame,
  so a fast-forwarded run records identically.
- **State.** `src/stores/hookStore.ts`, non-persisted like `krakenStore`:
  `hookMode`, `worldSeed`, `timeScale`, `showHitboxes`, the live run snapshot, the
  last recording. No cross-store subscriptions (ARCHITECTURE §39).
- **Gating.** `manual` only counts as `DEBUG && hookMode === "manual"`
  (`VITE_DEBUG`, `src/constants/config.ts`), so a stale value can't leak into a
  production build and the key listener isn't attached otherwise. `<DebugPanel />`
  is currently mounted unconditionally (`App.tsx:102`) — Phase 0 gates it on `DEBUG`.
- **Sandbox.** Manual runs never call `startRound`/`completeRound`; the result shows
  only in the debug readout.
- **Debug panel.** New "Hook control" accordion: mode, seed (field, reroll, copy),
  speed, hit-boxes, readout (phase / x / depth / hooked), Save run (Phase 4). The
  existing "Hook" sliders keep driving `auto` only — the UI says so.
- **`App.tsx`.** One line changes:
  `depth = forceTrench ? KRAKEN_DEPTH_METERS : hookMode !== "auto" ? sim.depthM : descentDepth`.
  The Cast/Surface button starts and aborts the sandbox run.

## 5. Rendering integration

| Where                           | Change                                                                                                                                                                                                                                                                              | Applies      |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| `App.tsx`                       | depth source above; gate `<DebugPanel />`                                                                                                                                                                                                                                           | Phase 0–1    |
| `framing.ts`                    | optional `worldScale` (default 1) on `cameraScroll`, `depthWorldY`, `hookWorldY`                                                                                                                                                                                                    | sim modes    |
| `FishingLine.tsx`               | hook x/y from the sim snapshot. Drawn x = rod tip → sim x, blended by `castProgress` — not `hookX`'s ramp, which would keep the drawn hook off its hit-box for the first ≈1,800 m. Hook sprite scale fixed in sim px (today it follows the boat) so the drawn barb is the sim's tip | sim modes    |
| `Creatures.tsx`                 | draw from `sim.fish` (`fishX`; bite/struggle rows when hooked; attached to the hook). The wall-clock formula stays for `auto`                                                                                                                                                       | sim modes    |
| `Kraken.tsx` / `krakenFight.ts` | the KRAKEN phase sets `fightStart`; existing consumers unchanged                                                                                                                                                                                                                    | sim modes    |
| new `HitboxOverlay.tsx`         | mouth circles + hook tip, plain `Graphics` shapes redrawn each frame (no gradients/textures per frame — `docs/PERFORMANCE.md`)                                                                                                                                                      | debug        |
| `playerStore`                   | HOOKED → battle, REEL → reel, SURFACED → celebrate                                                                                                                                                                                                                                  | with §10/§14 |

**`worldScale`.** The sim world is 1920 sim-px wide (the desktop reference). In sim
modes the underwater scene — sprites, hook, `PX_PER_METER` — scales by
`k = view.width / 1920`, so hit-boxes and art agree on every viewport, and 1920 wide
is pixel-identical to today. `auto` keeps `k = 1` always. Sprites and the hook are
fixed pixel sizes today and the sim world is 1920 wide, so without this a narrower
screen would let the hook steer off-screen and the hit-boxes would stop lining up
with the art. On portrait, fit-width shows far more depth at once — decide in
Phase 0 with screenshots (§11).

## 6. Recording and SQLite

```ts
interface Recording {
	simVersion: number;
	worldSeed: number; // uint32 → spawnWorld
	multiplier: number; // catch weight — sets the landing, so it is part of the run
	inputs: Uint8Array; // per-tick axis −1/0/+1, run-length coded
	result: { fish: string; depthM: number; ticks: number };
}
```

The request's "hook path / fish paths / number of fish":

- **hook path** = the input stream (lossless);
- **fish paths** = `worldSeed` (closed form, §3.3);
- **fish count, path length, catch depth…** = summary columns, queryable.

Measured: a run that never steers is 2 bytes; each change of direction adds about one, so a hand-steered run is tens
of bytes and the worst case (flipping every tick) one byte a tick. A run is only ever the inputs up to SURFACED —
steering after the hook takes is ignored by the sim, so the server stores it as 0 and two runs that steered alike are
one row. Wire form is base64
(`btoa`/`atob`, no `Buffer` — the codec must run in both runtimes). A decoded-path
cache column is a later add, only if playback ever needs it. A recording only plays
on the `SIM_VERSION` it was made with; the client refuses a mismatch and falls back
to `auto`.

**Database.** `server/src/db.ts` is the only importer of `node:sqlite`. It is
experimental in Node 24 (run with `--disable-warning=ExperimentalWarning`); if it
ever bites, swap to `better-sqlite3` in that one file. File: `server/data/library.sqlite`,
WAL mode, added to `.gitignore` in the project-specific block.

```sql
CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);  -- sim_version, library_hash, frozen_at

CREATE TABLE recordings (
  id           INTEGER PRIMARY KEY,
  sim_version  INTEGER NOT NULL,
  source       TEXT    NOT NULL CHECK (source IN ('bot','human')),
  bot          TEXT,                    -- policy + params
  world_seed   INTEGER NOT NULL,
  multiplier   INTEGER NOT NULL,
  fish         TEXT    NOT NULL,        -- roster id caught = bucket key
  depth        TEXT    NOT NULL,        -- DepthId
  idx          INTEGER,                 -- dense per (sim_version, fish); assigned at freeze
  inputs       BLOB    NOT NULL,
  ticks        INTEGER NOT NULL,
  catch_tick   INTEGER NOT NULL,
  catch_meters REAL    NOT NULL,
  fish_count   INTEGER NOT NULL,
  path_len     REAL    NOT NULL,        -- Σ|Δx|, sim px
  sha256       TEXT    NOT NULL UNIQUE, -- over canonical bytes
  created_at   INTEGER NOT NULL,
  UNIQUE (sim_version, fish, idx)
);
CREATE TABLE sim_runs (                 -- every game simulated, aggregated
  sim_version INTEGER, bot TEXT, fish TEXT, games INTEGER, kept INTEGER,
  PRIMARY KEY (sim_version, bot, fish)
);
```

Checked on this machine (in memory): 200k inserts of 1.5 KB blobs in 0.67 s, 20k
point reads in 0.1 s — the DB isn't the constraint, size is. 18 fish × 5,000 kept
≈ 90k rows ≈ 100 MB.

## 7. Simulating millions

`pnpm sim:build --runs 2000000 --quota 5000 --seed <master>` (`server/src/tools/`,
not on the request path):

- **Bots** share the human's input model (axis −1/0/+1 per tick). `wander`: seeded
  random dwell times, humanised so replays don't look robotic. `seek(fish)`: aim at
  where the target's mouth will be when the hook reaches its depth (closed-form paths
  make this analytic) and dodge other mouths on the way down.
- **Loop.** Run headless, classify by `result.fish`, keep it if that bucket is under
  quota (dedupe by `sha256`), always bump `sim_runs`. The neediest bucket gets `seek`
  — random wandering alone would never reach the whale or the Kraken.
- **Throughput.** A throwaway prototype (61 fish, closed-form paths, 300 wander runs)
  did ≈15M ticks/s on one core: a full 8k-tick run in well under a millisecond, so a
  million runs is minutes to low tens of minutes. No `worker_threads` until measured.
- **`pnpm sim:freeze`.** Sorts each bucket by `sha256`, assigns dense `idx`, writes
  `libraryHash = sha256(simVersion ‖ per fish in roster order: id ‖ N ‖ sha256[0..N))`.
  The server only serves a frozen library; a dev server may use an unfrozen one, but
  reports `libraryHash: "unfrozen"` and its rounds don't verify.
- **Gap gate.** Freeze fails if a roster fish has fewer than a minimum number of
  recordings; the server logs any empty bucket at boot.
- **Rebuild rule.** Any change to speeds, world, mouths or hook → bump `SIM_VERSION`
  → rebuild (minutes). Pace tuning therefore happens before the library is frozen.

## 8. Replay, re-run and provably fair

**The chain** (`S` server seed, `C` client seed, `n` nonce; existing unless marked):

1. `outcome = rollOutcome(S, C, n)` — depth → fish → tier. Unchanged, and the only
   input to payout.
2. **New:** `i = rollInt(byteStream(S, C, n, "replay"), N_f)` where `N_f` is the
   frozen bucket size for `outcome.fish`. `byteStream` gains an optional `label`
   that changes the HMAC message only when given
   (`${C}:${n}:${label}:${block}`); unlabelled streams — every existing outcome —
   are byte-identical, so nothing already verifiable moves.
3. **New:** `recording = library[f][i]`. The round stores
   `replay = { libraryHash, fish, bucketSize, index, sha256, recording }` — a copy of
   the recording, so a round stays replayable whatever happens to the library.
4. The client re-simulates `worldSeed + inputs`; the run ends with `f` on the hook.

**Wire.** `Round.replay` in `rounds.ts` → `RoundResult.replay` (the `start`
response), `RoundDetailResponse.replay`, history entries. `SeedResponse` gains
`libraryHash`, so everything committed before play sits in one place. `verify` takes
an optional `libraryHash` and returns `replay: { fish, bucketSize, index }`. Types
live in `src/types/api.ts`; only `src/api/index.ts` decodes the envelope (Rule 6).
`server/openapi.yaml` updates in the same commit as each route.

**Verifying a round** (after the server seed is revealed): recompute the outcome →
recompute `i` from the same seeds and the committed bucket size → check
`sha256(recording)` matches the round and is in the manifest behind `libraryHash` →
re-simulate `recording`: its catch must equal `outcome.fish`.

**Why it stays fair.** Payout depends on step 1 alone. The pick happens after, and
only from, the outcome; it can't move RTP. The library is committed before play, so
the visual wasn't cherry-picked either. Forced debug outcomes still won't verify, as
today.

**Today's real rounds (BUILD_PLAN §30) use a live bot instead of the library.** `createSim(worldSeed, multiplier, target)` takes
the roster id the server chose: `hookFish` and `autopilotAxis` only see fish of that kind, so the same pure autopilot
that used to take whatever was nearest now steers for the server's fish and nothing else can take the hook; the Kraken
(not in the world) is the run to the bottom. The catch's `multiplier` is the fish's price on the round's market, not a debug
setting. The autopilot never missed in 15,600 runs (every fish, 600 world seeds each), and `simAutopilot.test.ts` keeps a
smaller version of that check. A run aimed at a fish has no replay (the server's re-simulation has no target), so it
leaves no `Recording`. The library below is still the plan for a replayable, provably-fair visual.

**Fallback.** No recording for the outcome → `replay: null` → the client plays
today's `auto` descent, logged and counted. Presentation can never block or alter a
round.

**Re-run a round (debug).** New "Recordings" accordion:

- list by fish; **Play** → `replay` mode, the client re-simulates and draws it;
- **Re-run round** → `getRound(id)` → its stored recording (no library needed);
- **Verify on server** → `POST /api/debug/recordings/:id/verify` re-simulates and
  compares hash + result;
- **Save run** → `POST /api/debug/recordings` — the server re-simulates, ignores any
  client-claimed result, rejects a `simVersion` mismatch (409) or inputs that don't end in SURFACED (400), stores
  `source = 'human'`. The body carries no `result` at all. The mock server sends CORS headers in debug builds so the
  browser can reach it (the client is on another origin).

All under `config.debugControls`, so the routes don't exist in production.

## 9. Phases

Each phase leaves the game runnable. Tests first, and an e2e spec per interactive
feature (`.claude/docs/ANIMO.md`).

| #   | Phase             | Request | Done when                                                                                                                                                                                                                                                                                                     |
| --- | ----------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0   | Groundwork        | —       | `auto` unchanged: existing unit + e2e green and a 1920×1080 fake-clock screenshot identical before/after. `src/utils/sim*.ts` import cleanly under Node. `hookStore` exists, default `auto`. `<DebugPanel />` gated on `DEBUG`. `worldScale` plumbed at 1. ARCHITECTURE §4 points at the shared-sim exception |
| 1   | Arrow-key control | 1       | Manual mode: ←/→ steer the hook, descent follows the sim speeds, creatures still `auto`. Keys inert in production builds and while typing. e2e reads the x readout                                                                                                                                            |
| 2   | Hook by the mouth | 2       | Sim world + mouth hit-boxes + overlay + HOOKED. Seeded e2e: a scripted key sequence hooks a known fish, a near miss doesn't                                                                                                                                                                                   |
| 3   | Reel-in           | 3       | REEL, KRAKEN, SURFACED: a full manual round runs cast → hook → reel → surface. Golden-trajectory test green in vitest, Node and Playwright chromium/firefox/webkit                                                                                                                                            |
| 4   | Record → SQL      | 4       | `Recording` + codec; `db.ts` + schema; Save run → server re-simulates and inserts; `sha256` stable. `pnpm test:server` covers it and CI runs it                                                                                                                                                               |
| 5   | Re-run            | 5       | Recordings accordion: list / play / verify / re-run round; a played recording reproduces its recorded catch                                                                                                                                                                                                   |
| 6   | Millions          | 6       | `pnpm sim:build` fills every bucket or reports the gaps; `sim:freeze` gives a reproducible hash; yield table per bot and fish                                                                                                                                                                                 |
| 7   | Provably fair     | 7       | Labelled stream, pick, `libraryHash` in `/api/seed/current`, `verify` extended, `openapi.yaml`. A script proves catch == outcome for 10k random seed triples                                                                                                                                                  |
| 8   | Real rounds       | —       | After BUILD_PLAN §9: start → replay → surfaced → complete; `auto` fallback on an empty bucket; production build has no manual controls                                                                                                                                                                        |

Phases 1–7 don't depend on the betting/round wiring (BUILD_PLAN §8–9), which isn't
in the client yet. Phase 8 does; if §9 lands late, ship a debug "play replay for
outcome X" button that runs the same pick.

## 10. Testing

- **vitest** (colocated): `simStep` (kinematics, mouth arming, first-touch and ties,
  phases, Kraken, determinism), `simRecording` (codec round-trip, hash), `simConfig`
  (drift guards, roster coverage), `useHookKeys`, `useHookSim`.
- **node:test**: `library` (insert, `idx`, freeze, hash), `replay` (deterministic
  pick; every stored recording re-simulates to its bucket), `simulate` (tiny build
  fills small buckets), the debug routes.
- **Golden trajectory**: a fixed `worldSeed` + scripted inputs → a constant state
  hash. Runs in vitest, in Node, and in a Playwright spec that evaluates the sim in
  the page under all three engines — the only real cross-engine determinism check.
  Firefox/WebKit run in CI only; locally only chromium is installed.
- **e2e** `e2e/hook-control.spec.ts`: steering, hooking, reel-in, and that no
  `/api/game/*` request is made in manual mode. Driven with a paused fake clock
  (`page.clock`) so runs are exact.

## 11. Skipped, risks, open questions

**Skipped** — add when:

- _Live per-round search instead of a stored library._ Also provably fair and simpler;
  not chosen because the request is for a stored SQL library (pre-vetted visuals,
  audit trail, analytics). The library builder is that search, run ahead of time.
- _Merkle inclusion proofs_ — a flat manifest hash for now; add if auditors need
  per-recording proofs without the full list.
- _`worker_threads`_ — measure first. _Interpolated rendering_ — 60 Hz is fine at
  ≤140 px/s. _Touch controls, fish reacting to the hook, per-frame mouths,
  Postgres_ — nobody has asked.

**Risks**

- Any change to speeds, world, mouths or hook rebuilds the library (minutes). Old
  rounds re-run only on the build whose `SIM_VERSION` matches.
- Bot yield for rare fish (the whale is 2 fish in a 670 m band; the Kraken needs a
  dodge past all 61) — measured in Phase 6; `seek` gets more lookahead if it's poor.
- Round length now follows the catch: a few seconds (shallow) to ≈2½ min (Kraken) at
  today's debug speeds.
- `node:sqlite` is experimental in Node 24 (isolated in `db.ts`).
- `meta` and `sim_runs` (§6) aren't created yet — Phase 6 adds them (`CREATE TABLE IF NOT EXISTS`).

**Open questions** (default in bold):

1. Stand-in art for roster ids with no sheet (blue-cod, starfish; and
   swordfish, sardine, king-crab whose names don't match a file):
   **mackerel→sardine, crab→king-crab, pike→swordfish; the rest reuse the nearest
   sheet until the manifest's marlin / blue-reef-fish / starfish / parrotfish PNGs land**.
2. Cap on round length? **None — pace lives in `simConfig`.**
3. Portrait: **fit-width** (whole sim width visible), confirmed in Phase 0 screenshots.

## 12. Verification

Per phase: `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm test`, `pnpm test:server`,
`pnpm e2e:test --project=desktop-chrome`. Anything visual is checked in the live
renderer with the repo's paused-fake-clock routine, hit-box overlay on. Node
processes started for a check are killed afterwards (they hold port 4201).

Phases 6–7: `pnpm sim:build --runs 1000000`, then the proof script — for 10,000
random seed triples, outcome → replay pick → re-simulate → catch must equal
`outcome.fish`, and the library hash must reproduce from a re-freeze.
