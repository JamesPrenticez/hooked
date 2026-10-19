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

import { FISH } from "./constants.ts";
import { getForcedOutcome } from "./debug-state.ts";
import { applyBonus, outcomeFor, rollBonus, rollCatch, rollMarket } from "./market.ts";
import { fromCents, toCents } from "./money.ts";
import { byteStream } from "./rng.ts";
import { consumeNonce } from "./seeds.ts";

export type DepthId = "shallow" | "reef" | "deep" | "abyss" | "jackpot";
export type FishTier = "small" | "large" | "epic" | "legendary" | "jackpot";
export type Volatility = "low" | "medium" | "high";
export type RoundStatus = "open" | "completed";

/** One line of a round's fish market: what the fish pays if it is the one landed this round. */
export interface MarketEntry {
	fish: string;
	/** Decimal string, in multiples of the stake. */
	multiplier: string;
}

/** A highlighted fish: if it is the one landed this round, its payout is multiplied by this. */
export interface BonusEntry {
	fish: string;
	/** Decimal string, a whole multiple of the stake (100 to 8888). */
	multiplier: string;
}

export interface FishingOutcome {
	depth: DepthId;
	fish: string;
	tier: FishTier;
	/** What the landed fish pays this round: its price on the market, times its bonus if it was highlighted. */
	multiplier: string;
}

export interface PayoutResult {
	total: string;
	wagered: string;
	/** total − wagered; negative when the catch pays less than the stake. */
	net: string;
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
	/** Decimal string. */
	stake: string;
	volatility: Volatility;
	market: MarketEntry[];
	/** The 1 to 5 fish highlighted this round, each with the bonus it pays if landed. */
	bonus: BonusEntry[];
	outcome: FishingOutcome;
	payout: PayoutResult;
	seed: RoundSeed;
	createdAt: number;
	completedAt?: number;
}

const byId = new Map<string, Round>();
const openByPlayer = new Map<string, string>(); // playerId -> roundId

/**
 * The pure provably-fair roll (§11, §36) — deterministic in
 * (serverSeed, clientSeed, nonce, volatility) and nothing else. POST
 * /api/game/verify recomputes exactly this, so it must never consult
 * debug/force state.
 *
 * One stream, in order: where the hook dives, which fish it lands, then the highlighted fish.
 */
export function rollRound(serverSeed: string, clientSeed: string, nonce: number, volatility: Volatility) {
	const stream = byteStream(serverSeed, clientSeed, nonce);
	const market = rollMarket(volatility);
	const caught = rollCatch(stream, volatility, market);
	const bonus = rollBonus(stream, caught.fish);
	return { market, bonus, outcome: applyBonus(caught, bonus) };
}

function generateRound(serverSeed: string, clientSeed: string, nonce: number, volatility: Volatility) {
	const rolled = rollRound(serverSeed, clientSeed, nonce, volatility);
	// Dev override (§16/§17) — an alternative to the seed, not part of it, so
	// a forced round intentionally will not match POST /api/game/verify.
	// routes/debug.ts has already validated these against the roster. A forced
	// depth lands that zone's first fish.
	const { fish, depth } = getForcedOutcome();
	const forced = fish ? FISH.find(f => f.id === fish) : depth ? FISH.find(f => f.depth === depth) : undefined;
	return forced ? { ...rolled, outcome: applyBonus(outcomeFor(forced, rolled.market), rolled.bonus) } : rolled;
}

/** What `stakeCents` pays at `multiplier` (a decimal string), in whole cents, halves rounding up. Integer arithmetic
 *  until the last divide, so no float error can tip a half cent. */
export function payoutCents(stakeCents: number, multiplier: string): number {
	return Math.round((stakeCents * toCents(multiplier)) / 100);
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

/** Caller (routes/game.ts) has already validated the stake, the volatility and the balance. */
export function openRound(playerId: string, stake: string, volatility: Volatility): Round {
	const seed = consumeNonce(playerId);
	const { market, bonus, outcome } = generateRound(seed.serverSeed, seed.clientSeed, seed.nonce, volatility);
	const wagered = toCents(stake);
	const total = payoutCents(wagered, outcome.multiplier);
	const round: Round = {
		roundId: randomUUID(),
		playerId,
		status: "open",
		stake,
		volatility,
		market,
		bonus,
		outcome,
		payout: {
			total: fromCents(total),
			wagered: fromCents(wagered),
			net: fromCents(total - wagered)
		},
		seed: {
			serverSeedHash: seed.serverSeedHash,
			clientSeed: seed.clientSeed,
			nonce: seed.nonce
		},
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
