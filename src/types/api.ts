// The wire contract (ARCHITECTURE.md §5). The mock server mirrors these shapes
// by hand — there is no shared package. Only `@api` imports this to talk to the
// server; stores and components use the typed helpers instead (§7).
//
// Wire rules: camelCase fields; money is always a decimal string ("1.00"),
// never a float; zero-valued fields are emitted, not omitted.

export interface SessionResponse {
	sessionToken: string;
	playerId: string;
	currency: string;
	balance: string;
}

export interface BalanceResponse {
	balance: string;
	currency: string;
}

/** POST /api/game/current — balance plus any in-progress round to resume (§30). */
export interface CurrentResponse {
	balance: string;
	currency: string;
	active: boolean;
	roundId?: string;
	/** The open round's bets — present only when active. Outcome/payout are
	 *  deliberately withheld here (§30); call getRound(roundId) for the full
	 *  result to resume presentation from. */
	bets?: Bet[];
}

/** Non-2xx responses carry this instead of a result. */
export interface ErrorBody {
	error: { code: string; message: string };
}

export interface Bet {
	type: "depth" | "fish";
	selection: string;
	/** Decimal string. */
	amount: string;
}

export type DepthId = "shallow" | "reef" | "deep" | "abyss" | "jackpot";
export type FishTier = "small" | "large" | "epic" | "legendary" | "jackpot";

export interface FishingOutcome {
	depth: DepthId;
	fish: string;
	tier: FishTier;
}

/** Provably-fair context recorded with a round (ARCHITECTURE.md §36). The raw
 *  server seed is withheld until it is rotated away and revealed. */
export interface RoundSeed {
	serverSeedHash: string;
	clientSeed: string;
	nonce: number;
}

// --- Round play — POST /api/game/play, the { message: { <oneVariant> } } envelope (§5) ---

export interface StartMessage {
	bets: Bet[];
}

export interface CompleteMessage {
	roundId: string;
}

/** Exactly one variant set. */
export type PlayMessage = { start: StartMessage } | { complete: CompleteMessage };

export interface PlayRequest {
	message: PlayMessage;
}

export interface BetResult extends Bet {
	won: boolean;
	/** Decimal string. */
	multiplier: string;
	/** Decimal string; "0.00" when lost — zero emitted, not omitted (§5). */
	payout: string;
}

export interface PayoutResult {
	/** Decimal string — sum of winning bets' payouts; what `complete` credits to balance. */
	total: string;
	/** Decimal string — sum of bet amounts; what `start` already debited. */
	wagered: string;
	/** Decimal string — `total` − `wagered`; negative (leading "-") on a losing round. */
	net: string;
}

export interface RoundResult {
	roundId: string;
	outcome: FishingOutcome;
	bets: BetResult[];
	payout: PayoutResult;
	/** Always "0" on /game/play responses — NOT authoritative (§14). Read
	 *  balance from getBalance() or track it locally. */
	metadata: { balance: string };
}

/** POST /api/game/play response envelope. */
export interface PlayResponse {
	message: RoundResult;
	roundId: string;
}

export type RoundStatus = "open" | "completed";

/** GET /api/game/round/{id} — always full detail, regardless of status (§5). */
export interface RoundDetailResponse {
	roundId: string;
	status: RoundStatus;
	outcome: FishingOutcome;
	bets: BetResult[];
	payout: PayoutResult;
	seed: RoundSeed;
}

export interface HistoryEntry {
	roundId: string;
	outcome: FishingOutcome;
	bets: BetResult[];
	payout: PayoutResult;
	seed: RoundSeed;
	completedAt: string; // ISO-8601
}

/** GET /api/game/history — full list, no pagination this milestone (§22). */
export interface HistoryResponse {
	rounds: HistoryEntry[];
}

// --- Provably-fair seeds — /api/seed/*, POST /api/game/verify (§36) ---

/** POST /api/seed/current — active seed context. */
export interface SeedResponse {
	serverSeedHash: string;
	clientSeed: string;
	nonce: number;
}

/** POST /api/seed/upcoming — hash of the next server seed, active after a rotate. */
export interface UpcomingSeedResponse {
	serverSeedHash: string;
}

/** POST /api/seed/reveal — a rotated-away pair with the server seed disclosed. */
export interface RevealedSeedResponse {
	serverSeed: string;
	serverSeedHash: string;
	clientSeed: string;
	nonce: number;
}

/** POST /api/game/verify — outcome recomputed from a seed triple. Compare it
 *  to the round's stored outcome; a match is the proof. */
export interface VerifyResponse {
	serverSeedHash: string;
	clientSeed: string;
	nonce: number;
	outcome: FishingOutcome;
}

// --- Dev controls — /api/debug/*, gated by VITE_DEBUG, absent in production (§16/§17) ---

/** Any subset forces that field; omit to leave it rolled. `{}` clears the override. */
export interface ForcedOutcome {
	depth?: DepthId;
	fish?: string;
	tier?: FishTier;
}

export interface DebugSimulation {
	/** Fixed delay added to every non-debug request, in ms. */
	latencyMs: number;
	/** 0..1 chance each non-debug request fails with a simulated 500. */
	errorRate: number;
}

/** GET /api/debug/state, and the echo returned by force-outcome / simulate. */
export interface DebugStateResponse {
	forcedOutcome: ForcedOutcome;
	simulation: DebugSimulation;
}

/** POST /api/debug/recordings — a finished sandbox run (BUILD_PLAN 29.4). The server re-simulates it and never
 *  reads a claimed result, so there isn't one here. */
export interface SaveRecordingRequest {
	simVersion: number;
	worldSeed: number;
	multiplier: number;
	/** Base64 of the run-length-coded per-tick steering. */
	inputs: string;
}

export interface SavedRecordingResponse {
	id: number;
	/** Over the canonical bytes of the run — the same run always hashes the same. */
	sha256: string;
	/** Roster id the server's re-simulation says it caught. */
	fish: string;
	depth: DepthId;
	ticks: number;
	/** An identical run was already stored, so nothing was added. */
	duplicate: boolean;
}

/** POST /api/debug/recordings — a finished sandbox run (§29.4). The server re-simulates it and never reads a claimed
 *  result, so there isn't one here. */
export interface SaveRecordingRequest {
	simVersion: number;
	worldSeed: number;
	multiplier: number;
	/** Base64 of the run-length-coded per-tick steering. */
	inputs: string;
}

export interface SavedRecordingResponse {
	id: number;
	/** Over the canonical bytes of the run — the same run always hashes the same. */
	sha256: string;
	/** Roster id the server's re-simulation says it caught. */
	fish: string;
	depth: DepthId;
	ticks: number;
	/** An identical run was already stored, so nothing was added. */
	duplicate: boolean;
}
