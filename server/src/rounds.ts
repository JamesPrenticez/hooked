// In-memory round store (§9, §14, §30). Mirrors sessions.ts's style — a Map,
// wiped on restart, no persistence. Keyed by playerId, not sessionToken:
// POST /api/session/refresh rotates the token, not the player, so an open
// round must survive a refresh instead of getting orphaned. At most one open
// round per player.
//
// These types are the server's hand-mirror of src/types/api.ts's wire shapes
// (§4 — no shared package). Only the fields the mock server needs to compute
// with live here.

import { randomUUID } from "node:crypto";

import { getForcedOutcome } from "./debug-state.ts";
import { fromCents, toCents } from "./money.ts";

export type DepthId = "shallow" | "reef" | "deep" | "abyss" | "trench";
export type FishTier = "small" | "large" | "epic" | "legendary" | "jackpot";
export type RoundStatus = "open" | "completed";

export interface Bet {
	type: "depth" | "fish";
	selection: string;
	amount: string;
}

export interface FishingOutcome {
	depth: DepthId;
	fish: string;
	tier: FishTier;
}

export interface BetResult extends Bet {
	won: boolean;
	multiplier: string;
	payout: string;
}

export interface PayoutResult {
	total: string;
	wagered: string;
}

export interface Round {
	roundId: string;
	playerId: string;
	status: RoundStatus;
	bets: Bet[];
	outcome: FishingOutcome;
	betResults: BetResult[];
	payout: PayoutResult;
	createdAt: number;
	completedAt?: number;
}

const byId = new Map<string, Round>();
const openByPlayer = new Map<string, string>(); // playerId -> roundId

const DEPTHS: DepthId[] = ["shallow", "reef", "deep", "abyss", "trench"];

// ponytail: flat placeholder outcome/payout — milestone 3 (Authoritative
// Server Mathematics) replaces this with the real probability-weighted RNG
// and payout table (§17, §36). There is no fish roster yet, so a fish bet
// can only win by matching this literal placeholder name — expected, not a
// bug, until the real fish list lands.
const PLACEHOLDER_FISH = "placeholder-fish";
const PLACEHOLDER_TIER: FishTier = "small";
const PLACEHOLDER_MULTIPLIER_CENTS = 200; // flat 2.00x on every winning bet

function generateOutcome(): FishingOutcome {
	const depth = DEPTHS[Math.floor(Math.random() * DEPTHS.length)];
	const rolled: FishingOutcome = { depth, fish: PLACEHOLDER_FISH, tier: PLACEHOLDER_TIER };
	// Dev override (§16/§17). routes/debug.ts has already validated these
	// against the depth/tier enums; fish is a free string until the roster lands.
	const forced = getForcedOutcome();
	return {
		depth: (forced.depth as DepthId) ?? rolled.depth,
		fish: forced.fish ?? rolled.fish,
		tier: (forced.tier as FishTier) ?? rolled.tier
	};
}

function resolveBet(bet: Bet, outcome: FishingOutcome): BetResult {
	const won = bet.type === "depth" ? bet.selection === outcome.depth : bet.selection === outcome.fish;
	const payoutCents = won ? Math.round((toCents(bet.amount) * PLACEHOLDER_MULTIPLIER_CENTS) / 100) : 0;
	return { ...bet, won, multiplier: fromCents(PLACEHOLDER_MULTIPLIER_CENTS), payout: fromCents(payoutCents) };
}

export function hasOpenRound(playerId: string): boolean {
	return openByPlayer.has(playerId);
}

export function getOpenRound(playerId: string): Round | undefined {
	const id = openByPlayer.get(playerId);
	return id ? byId.get(id) : undefined;
}

export function getRound(roundId: string): Round | undefined {
	return byId.get(roundId);
}

/** Caller (routes/game.ts) has already validated the bets and the balance. */
export function openRound(playerId: string, bets: Bet[]): Round {
	const outcome = generateOutcome();
	const betResults = bets.map(b => resolveBet(b, outcome));
	const wagered = bets.reduce((sum, b) => sum + toCents(b.amount), 0);
	const total = betResults.reduce((sum, b) => sum + toCents(b.payout), 0);
	const round: Round = {
		roundId: randomUUID(),
		playerId,
		status: "open",
		bets,
		outcome,
		betResults,
		payout: { total: fromCents(total), wagered: fromCents(wagered) },
		createdAt: Date.now()
	};
	byId.set(round.roundId, round);
	openByPlayer.set(playerId, round.roundId);
	return round;
}

export function settleRound(round: Round): void {
	round.status = "completed";
	round.completedAt = Date.now();
	openByPlayer.delete(round.playerId);
}

/** Wipes every round + open-round pointer — used by POST /api/debug/reset-session. */
export function resetRounds(): void {
	byId.clear();
	openByPlayer.clear();
}

// ponytail: O(n) scan of every round ever opened — fine at dev/mock scale
// (§16, never persisted, wiped on restart); index by playerId if this ever
// needs to handle real volume.
export function listCompleted(playerId: string): Round[] {
	return [...byId.values()]
		.filter(r => r.playerId === playerId && r.status === "completed")
		.sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
}
