// The single wire boundary (ARCHITECTURE.md §7). This is the ONLY file in src/
// that knows the server's URLs and envelope. Stores and components call the
// typed helpers below — they never call fetch or see a wire shape.
//
// None of these helpers are wired into the app yet — that starts with the
// Loading Screen milestone (5). This milestone only defines the contract.

import { API_BASE_URL, DEBUG } from "@/constants/config";
import type {
	BalanceResponse,
	Bet,
	CurrentResponse,
	DebugStateResponse,
	ErrorBody,
	ForcedOutcome,
	HistoryResponse,
	PlayResponse,
	RevealedSeedResponse,
	RoundDetailResponse,
	RoundResult,
	SeedResponse,
	SessionResponse,
	UpcomingSeedResponse,
	VerifyResponse
} from "@/types/api";

// Persisted so a page reload restores the session instead of minting a new one
// (BUILD_PLAN §4.1). In-memory copy is the source of truth for requests; storage
// is just the survival mechanism across reloads.
const TOKEN_KEY = "deepcatch.sessionToken";

function readStoredToken(): string | null {
	try {
		return localStorage.getItem(TOKEN_KEY);
	} catch {
		return null;
	}
}

let sessionToken: string | null = readStoredToken();

function setToken(next: string | null) {
	sessionToken = next;
	try {
		if (next) localStorage.setItem(TOKEN_KEY, next);
		else localStorage.removeItem(TOKEN_KEY);
	} catch {
		// Storage disabled (private mode): the session still works for this
		// tab, it just won't survive a reload.
	}
}

/** Notified when the server rejects our token. Consumed by StoreSync (§7). */
export let onSessionExpired: (() => void) | null = null;
export function setOnSessionExpired(fn: () => void) {
	onSessionExpired = fn;
}

export class ApiError extends Error {
	constructor(
		public status: number,
		public code: string,
		message: string
	) {
		super(message);
	}
}

async function request<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
	const headers = new Headers(init.headers);
	if (init.body) headers.set("content-type", "application/json");
	if (auth && sessionToken) headers.set("authorization", `Bearer ${sessionToken}`);

	let res: Response;
	try {
		res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
	} catch (err) {
		throw new ApiError(0, "network_error", err instanceof Error ? err.message : "Network request failed");
	}
	const data = res.status === 204 ? null : await res.json().catch(() => null);

	if (!res.ok) {
		const err = (data as ErrorBody | null)?.error;
		if (res.status === 401) {
			setToken(null); // stale token — next initSession() mints a fresh one
			onSessionExpired?.();
		}
		throw new ApiError(res.status, err?.code ?? "unknown", err?.message ?? res.statusText);
	}
	return data as T;
}

export async function createSession(): Promise<SessionResponse> {
	const session = await request<SessionResponse>("/api/session", { method: "POST" }, false);
	setToken(session.sessionToken);
	return session;
}

/**
 * Boot-time session bring-up (BUILD_PLAN §4.1). In order: adopt a
 * `?sessionToken=` from the launch URL; else restore a persisted token and
 * confirm it still works; else mint a fresh session. Always resolves to the
 * authoritative current state — balance plus any resumable round (§30).
 *
 * Not wired into the app here — the Loading Screen (milestone 5) calls this.
 */
export async function initSession(): Promise<CurrentResponse> {
	if (adoptSessionTokenFromUrl()) return getCurrent();

	const stored = readStoredToken();
	if (stored) {
		setToken(stored);
		try {
			return await getCurrent();
		} catch (err) {
			// A stale token 401s; request() has already cleared it. Anything
			// else (network, 500) is the caller's to handle.
			if (!(err instanceof ApiError) || err.status !== 401) throw err;
		}
	}

	await createSession();
	return getCurrent();
}

/**
 * Adopts ?sessionToken= from the launch URL and strips it from the address
 * bar (§35). Returns whether a token was found. Caller decides the
 * fallback, e.g. `if (!adoptSessionTokenFromUrl()) await createSession();`.
 */
export function adoptSessionTokenFromUrl(): boolean {
	const url = new URL(window.location.href);
	const token = url.searchParams.get("sessionToken");
	if (!token) return false;
	setToken(token);
	url.searchParams.delete("sessionToken");
	window.history.replaceState({}, "", url);
	return true;
}

/**
 * Rotates the session token (§35: each token refreshes at most once). No
 * automatic scheduling — ponytail: skipped, add once a real session-TTL
 * policy exists to schedule against; nothing calls this yet.
 */
export async function refreshSession(): Promise<SessionResponse> {
	const session = await request<SessionResponse>("/api/session/refresh", { method: "POST" });
	setToken(session.sessionToken);
	return session;
}

export function getBalance(): Promise<BalanceResponse> {
	return request<BalanceResponse>("/api/game/balance");
}

export function getCurrent(): Promise<CurrentResponse> {
	return request<CurrentResponse>("/api/game/current", { method: "POST" });
}

export async function startRound(bets: Bet[]): Promise<RoundResult> {
	const res = await request<PlayResponse>("/api/game/play", {
		method: "POST",
		body: JSON.stringify({ message: { start: { bets } } })
	});
	return res.message;
}

export async function completeRound(roundId: string): Promise<RoundResult> {
	const res = await request<PlayResponse>("/api/game/play", {
		method: "POST",
		body: JSON.stringify({ message: { complete: { roundId } } })
	});
	return res.message;
}

/** Full detail for one round — including a still-open one (§30; unlike getCurrent()). */
export function getRound(roundId: string): Promise<RoundDetailResponse> {
	return request<RoundDetailResponse>(`/api/game/round/${roundId}`);
}

export function getHistory(): Promise<HistoryResponse> {
	return request<HistoryResponse>("/api/game/history");
}

// --- Provably-fair seeds (§36). The player can inspect the active seed
// context, set their own client seed, reveal a rotated-away server seed and
// re-derive any past outcome from its triple. ---

export function getSeed(): Promise<SeedResponse> {
	return request<SeedResponse>("/api/seed/current", { method: "POST" });
}

/** Hash of the next server seed — verifiable after the following rotate. */
export function getUpcomingSeed(): Promise<UpcomingSeedResponse> {
	return request<UpcomingSeedResponse>("/api/seed/upcoming", { method: "POST" });
}

/** Reveal the current server seed and switch to the pre-committed next one.
 *  Optionally set a new client seed. Rejected while a round is open. */
export function rotateSeed(clientSeed?: string): Promise<SeedResponse> {
	return request<SeedResponse>("/api/seed/rotate", {
		method: "POST",
		body: JSON.stringify(clientSeed ? { clientSeed } : {})
	});
}

/** The most recently rotated-away pair, server seed disclosed for auditing. */
export function revealSeed(): Promise<RevealedSeedResponse> {
	return request<RevealedSeedResponse>("/api/seed/reveal", { method: "POST" });
}

/** Recompute a past outcome from its seed triple — compare to the round's
 *  stored outcome. Same inputs → same outcome, every time. */
export function verifyOutcome(seed: {
	serverSeed: string;
	clientSeed: string;
	nonce: number;
}): Promise<VerifyResponse> {
	return request<VerifyResponse>("/api/game/verify", { method: "POST", body: JSON.stringify(seed) });
}

// --- Dev controls (§16/§17). No-op unless VITE_DEBUG=true; the routes don't
// exist on a production server anyway. Unauthenticated by design — the gate is
// VITE_DEBUG, not the bearer token (ARCHITECTURE.md §8). ---

function debugRequest<T>(path: string, body?: unknown): Promise<T> {
	if (!DEBUG) throw new ApiError(0, "debug_disabled", "Debug controls require VITE_DEBUG=true");
	return request<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) }, false);
}

/** Pin any subset of the next outcome; `{}` clears the override. "Force Kraken"
 *  is `forceOutcome({ depth: "trench", fish: "kraken", tier: "jackpot" })`. */
export function forceOutcome(outcome: ForcedOutcome): Promise<DebugStateResponse> {
	return debugRequest<DebugStateResponse>("/api/debug/force-outcome", outcome);
}

/** Arm simulated latency/errors; pass only the fields you want to change. */
export function simulateConditions(sim: { latencyMs?: number; errorRate?: number }): Promise<DebugStateResponse> {
	return debugRequest<DebugStateResponse>("/api/debug/simulate", sim);
}

/** Reset every dev wallet — omit `balance` for the configured starting amount. */
export function resetBalance(balance?: string): Promise<{ ok: true }> {
	return debugRequest<{ ok: true }>("/api/debug/reset-balance", balance ? { balance } : {});
}

/** Drop every session + round; the current token dies and the client re-launches. */
export function resetSession(): Promise<{ ok: true }> {
	return debugRequest<{ ok: true }>("/api/debug/reset-session");
}

export function getDebugState(): Promise<DebugStateResponse> {
	if (!DEBUG) throw new ApiError(0, "debug_disabled", "Debug controls require VITE_DEBUG=true");
	return request<DebugStateResponse>("/api/debug/state", {}, false);
}
