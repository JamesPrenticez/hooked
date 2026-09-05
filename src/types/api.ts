// The wire contract (ARCHITECTURE.md §5). The mock server mirrors these shapes
// by hand — there is no shared package. Only `@/api` imports this to talk to the
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

export type DepthId = "shallow" | "reef" | "deep" | "abyss" | "trench";
export type FishTier = "small" | "large" | "epic" | "legendary" | "jackpot";

export interface FishingOutcome {
	depth: DepthId;
	fish: string;
	tier: FishTier;
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
}

export interface HistoryEntry {
	roundId: string;
	outcome: FishingOutcome;
	bets: BetResult[];
	payout: PayoutResult;
	completedAt: string; // ISO-8601
}

/** GET /api/game/history — full list, no pagination this milestone (§22). */
export interface HistoryResponse {
	rounds: HistoryEntry[];
}
