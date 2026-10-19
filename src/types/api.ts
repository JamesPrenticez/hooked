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
	/** The open round's stake and volatility — present only when active. The market, outcome and payout are
	 *  deliberately withheld here (§30); call getRound(roundId) for the full result to resume presentation from. */
	stake?: string;
	volatility?: Volatility;
}

/** Non-2xx responses carry this instead of a result. */
export interface ErrorBody {
	error: { code: string; message: string };
}

export type DepthId = "shallow" | "reef" | "deep" | "abyss" | "jackpot";
export type FishTier = "small" | "large" | "epic" | "legendary" | "jackpot";

/** How likely the hook is to dive deep: low keeps it in the shallows, high sends it deeper more often. */
export type Volatility = "low" | "medium" | "high";

/** One line of a round's fish market: what the fish pays if it is the one landed this round. */
export interface MarketEntry {
	fish: string;
	/** Decimal string, in multiples of the stake. Can be below 1 — a catch worth less than the stake. */
	multiplier: string;
}

/** A fish highlighted this round: if it is the one landed, its payout is multiplied by this. */
export interface BonusEntry {
	fish: string;
	/** Decimal string, a whole multiple (100 to 8888). */
	multiplier: string;
}

export interface FishingOutcome {
	depth: DepthId;
	fish: string;
	tier: FishTier;
	/** Decimal string — what the landed fish pays this round: its price on the market, times its bonus if it was highlighted. */
	multiplier: string;
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
	/** Decimal string. */
	stake: string;
	volatility: Volatility;
}

export interface CompleteMessage {
	roundId: string;
}

/** Exactly one variant set. */
export type PlayMessage = { start: StartMessage } | { complete: CompleteMessage };

export interface PlayRequest {
	message: PlayMessage;
}

export interface PayoutResult {
	/** Decimal string — the stake times the catch's multiplier; what `complete` credits to balance. */
	total: string;
	/** Decimal string — the stake; what `start` already debited. */
	wagered: string;
	/** Decimal string — `total` − `wagered`; negative (leading "-") when the catch pays less than the stake. */
	net: string;
}

export interface RoundResult {
	roundId: string;
	volatility: Volatility;
	/** Decimal string. */
	stake: string;
	/** Every fish and what it pays this round, in roster order — rotates each round. */
	market: MarketEntry[];
	/** The 1 to 5 fish highlighted this round, each with the bonus it pays if landed. */
	bonus: BonusEntry[];
	outcome: FishingOutcome;
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
	volatility: Volatility;
	stake: string;
	market: MarketEntry[];
	bonus: BonusEntry[];
	outcome: FishingOutcome;
	payout: PayoutResult;
	seed: RoundSeed;
}

export interface HistoryEntry {
	roundId: string;
	volatility: Volatility;
	stake: string;
	outcome: FishingOutcome;
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

/** POST /api/game/verify — a round recomputed from a seed triple and its volatility. Compare it to the round's
 *  stored market and outcome; a match is the proof. */
export interface VerifyResponse {
	serverSeedHash: string;
	clientSeed: string;
	nonce: number;
	volatility: Volatility;
	market: MarketEntry[];
	bonus: BonusEntry[];
	outcome: FishingOutcome;
}

// --- Dev controls — /api/debug/*, gated by VITE_DEBUG, absent in production (§16/§17) ---

/** A fish pins the catch; a depth pins the zone (landing its first fish). `{}` clears the override. */
export interface ForcedOutcome {
	depth?: DepthId;
	fish?: string;
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

/** GET /api/debug/recordings — the library, newest first (§29.5). */
export interface StoredRecording {
	id: number;
	fish: string;
	depth: DepthId;
	worldSeed: number;
	multiplier: number;
	ticks: number;
	source: "bot" | "human";
	sha256: string;
}

/** GET /api/debug/recordings/:id — enough to play the run again. */
export interface StoredRecordingDetail extends StoredRecording {
	simVersion: number;
	/** Base64 of the run-length-coded per-tick steering. */
	inputs: string;
}

/** POST /api/debug/recordings/:id/verify */
export interface VerifyRecordingResponse {
	id: number;
	ok: boolean;
	simVersion: number;
	/** The row's hash is what its inputs hash to now. */
	hashMatches: boolean;
	/** Re-simulating catches the fish and length the row says. */
	resultMatches: boolean;
	fish: string | null;
}
