// Per-player provably-fair seed state (§36). In-memory, wiped on restart like
// every other mock-server store. A player gets a seed pair lazily on first
// access. The active server seed stays secret until a rotate moves it into
// the revealed list; the hash of the *next* server seed is committed up front
// and exposed via POST /api/seed/upcoming.

import { generateSeed, hashSeed } from "./rng.ts";

export interface RevealedSeed {
	serverSeed: string;
	serverSeedHash: string;
	clientSeed: string;
	/** Rounds that consumed this pair — outcomes exist for nonce 0..nonce-1. */
	nonce: number;
}

interface SeedState {
	serverSeed: string;
	serverSeedHash: string;
	nextServerSeed: string;
	nextServerSeedHash: string;
	clientSeed: string;
	nonce: number;
	revealed: RevealedSeed[];
}

const byPlayer = new Map<string, SeedState>();

function freshState(): SeedState {
	const serverSeed = generateSeed();
	const nextServerSeed = generateSeed();
	return {
		serverSeed,
		serverSeedHash: hashSeed(serverSeed),
		nextServerSeed,
		nextServerSeedHash: hashSeed(nextServerSeed),
		clientSeed: generateSeed(),
		nonce: 0,
		revealed: []
	};
}

function get(playerId: string): SeedState {
	let state = byPlayer.get(playerId);
	if (!state) {
		state = freshState();
		byPlayer.set(playerId, state);
	}
	return state;
}

/** Public view — never exposes the live server seed. */
export function currentSeed(playerId: string) {
	const s = get(playerId);
	return { serverSeedHash: s.serverSeedHash, clientSeed: s.clientSeed, nonce: s.nonce };
}

/** Hash of the next server seed — committed now, active after the next rotate. */
export function upcomingSeed(playerId: string) {
	return { serverSeedHash: get(playerId).nextServerSeedHash };
}

/**
 * Rotates to the pre-committed next server seed. The old pair (with its final
 * nonce) moves into the revealed list. A new client seed can be supplied;
 * otherwise a fresh random one is generated. The caller must reject this
 * while a round is open (§36) — seeds.ts doesn't know about rounds.
 */
export function rotateSeed(playerId: string, clientSeed?: string) {
	const s = get(playerId);
	s.revealed.push({
		serverSeed: s.serverSeed,
		serverSeedHash: s.serverSeedHash,
		clientSeed: s.clientSeed,
		nonce: s.nonce
	});
	s.serverSeed = s.nextServerSeed;
	s.serverSeedHash = s.nextServerSeedHash;
	s.nextServerSeed = generateSeed();
	s.nextServerSeedHash = hashSeed(s.nextServerSeed);
	s.clientSeed = clientSeed && clientSeed.length > 0 ? clientSeed : generateSeed();
	s.nonce = 0;
	return currentSeed(playerId);
}

/** The most recently rotated-away pair, server seed fully disclosed. */
export function revealSeed(playerId: string): RevealedSeed | undefined {
	return get(playerId).revealed.at(-1);
}

/**
 * Reserves the current nonce for a new round and advances the counter.
 * Returns the full triple the outcome must be rolled from.
 */
export function consumeNonce(playerId: string) {
	const s = get(playerId);
	const triple = {
		serverSeed: s.serverSeed,
		serverSeedHash: s.serverSeedHash,
		clientSeed: s.clientSeed,
		nonce: s.nonce
	};
	s.nonce++;
	return triple;
}

/** Wipes every player's seed state — used by POST /api/debug/reset-session. */
export function resetSeeds(): void {
	byPlayer.clear();
}
