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
}

/** Non-2xx responses carry this instead of a result. */
export interface ErrorBody {
	error: { code: string; message: string };
}

// --- Round play: shapes defined now, wired in a later milestone (§5) ---

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
