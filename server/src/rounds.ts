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
import { byteStream, rollInt } from "./rng.ts";
import { consumeNonce } from "./seeds.ts";

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

/** Provably-fair context for one round (§36). The raw server seed is not
 *  here — it stays in seeds.ts until a rotate reveals it. */
export interface RoundSeed {
	serverSeedHash: string;
	clientSeed: string;
	nonce: number;
}

export interface Round {
	roundId: string;
	playerId: string;
	status: RoundStatus;
	bets: Bet[];
	outcome: FishingOutcome;
	betResults: BetResult[];
	payout: PayoutResult;
	seed: RoundSeed;
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

/**
 * The pure provably-fair roll (§36) — deterministic in
 * (serverSeed, clientSeed, nonce) and nothing else. POST /api/game/verify
 * recomputes exactly this, so it must never consult debug/force state.
 *
 * ponytail: only depth is drawn from the stream today — there is no fish
 * roster or tier-probability table until milestone 3, so fish/tier are flat
 * placeholders. Milestone 3 extends the same stream in order: depth → fish →
 * tier.
 */
export function rollOutcome(serverSeed: string, clientSeed: string, nonce: number): FishingOutcome {
	const stream = byteStream(serverSeed, clientSeed, nonce);
	const depth = DEPTHS[rollInt(stream, DEPTHS.length)];
	return { depth, fish: PLACEHOLDER_FISH, tier: PLACEHOLDER_TIER };
}

function generateOutcome(serverSeed: string, clientSeed: string, nonce: number): FishingOutcome {
	const rolled = rollOutcome(serverSeed, clientSeed, nonce);
	// Dev override (§16/§17) — an alternative to the seed, not part of it, so
	// a forced round intentionally will not match POST /api/game/verify.
	// routes/debug.ts has already validated these against the depth/tier enums.
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
	const seed = consumeNonce(playerId);
	const outcome = generateOutcome(seed.serverSeed, seed.clientSeed, seed.nonce);
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
		seed: { serverSeedHash: seed.serverSeedHash, clientSeed: seed.clientSeed, nonce: seed.nonce },
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
