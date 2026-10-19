// The single wire boundary (ARCHITECTURE.md §7). This is the ONLY file in src/
// that knows the server's URLs and envelope. Stores and components call the
// typed helpers below — they never call fetch or see a wire shape.
//
// None of these helpers are wired into the app yet — that starts with the
// Loading Screen milestone (5). This milestone only defines the contract.

import { API_BASE_URL, DEBUG } from "@constants/config";
import type {
	BalanceResponse,
	CurrentResponse,
	DebugStateResponse,
	ErrorBody,
	ForcedOutcome,
	HistoryResponse,
	MarketEntry,
	PlayMessage,
	PlayResponse,
	RevealedSeedResponse,
	RoundDetailResponse,
	RoundResult,
	SavedRecordingResponse,
	SaveRecordingRequest,
	SeedResponse,
	SessionResponse,
	StartMessage,
	StoredRecording,
	StoredRecordingDetail,
	UpcomingSeedResponse,
	VerifyRecordingResponse,
	VerifyResponse,
	Volatility
} from "@type/api";
import { type Recording, toBase64 } from "@utils/simRecording";

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
	const session = await request<SessionResponse>("/api/session/refresh", {
		method: "POST"
	});
	setToken(session.sessionToken);
	return session;
}

export function getBalance(): Promise<BalanceResponse> {
	return request<BalanceResponse>("/api/game/balance");
}

export function getCurrent(): Promise<CurrentResponse> {
	return request<CurrentResponse>("/api/game/current", { method: "POST" });
}

// One /api/game/play request at a time (§31, BUILD_PLAN §4.4) — a double-click
// or a retry storm must not fire a second wager or a second completion. The
// server 409s duplicates anyway; this stops the request ever leaving the client.
// ponytail: single in-process flag, not keyed by roundId — a client only ever
// has one play call outstanding. Key it if that stops being true.
let playInFlight = false;

async function play(message: PlayMessage): Promise<RoundResult> {
	if (playInFlight) throw new ApiError(0, "request_in_flight", "A play request is already in flight");
	playInFlight = true;
	try {
		const res = await request<PlayResponse>("/api/game/play", {
			method: "POST",
			body: JSON.stringify({ message })
		});
		return res.message;
	} finally {
		playInFlight = false;
	}
}

/** Opens a round at a stake and a volatility — the server rolls the market and the catch, and takes the stake. */
export function startRound(start: StartMessage): Promise<RoundResult> {
	return play({ start });
}

export function completeRound(roundId: string): Promise<RoundResult> {
	return play({ complete: { roundId } });
}

/** Full detail for one round — including a still-open one (§30; unlike getCurrent()). */
export function getRound(roundId: string): Promise<RoundDetailResponse> {
	return request<RoundDetailResponse>(`/api/game/round/${roundId}`);
}

/** The fish market of a volatility. It is fixed, so the idle screen can show it before any round exists. */
export async function getMarket(volatility: Volatility): Promise<MarketEntry[]> {
	return (await request<{ market: MarketEntry[] }>(`/api/game/market/${volatility}`)).market;
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
	return request<UpcomingSeedResponse>("/api/seed/upcoming", {
		method: "POST"
	});
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

/** Recompute a past round from its seed triple and volatility — compare to the
 *  round's stored market and outcome. Same inputs → same round, every time. */
export function verifyOutcome(seed: {
	serverSeed: string;
	clientSeed: string;
	nonce: number;
	volatility: Volatility;
}): Promise<VerifyResponse> {
	return request<VerifyResponse>("/api/game/verify", {
		method: "POST",
		body: JSON.stringify(seed)
	});
}

// --- Dev controls (§16/§17). No-op unless VITE_DEBUG=true; the routes don't
// exist on a production server anyway. Unauthenticated by design — the gate is
// VITE_DEBUG, not the bearer token (ARCHITECTURE.md §8). ---

function debugRequest<T>(path: string, body?: unknown): Promise<T> {
	if (!DEBUG) throw new ApiError(0, "debug_disabled", "Debug controls require VITE_DEBUG=true");
	return request<T>(path, { method: "POST", body: JSON.stringify(body ?? {}) }, false);
}

/** Pin the next round's catch to a fish or a depth zone; `{}` clears the override. "Force Kraken"
 *  is `forceOutcome({ fish: "kraken" })`. */
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

/** Saves a finished sandbox run to the recording library. The server re-simulates it and stores what that
 *  catches, so the run's own `result` isn't sent. */
export function saveRecording({
	simVersion,
	worldSeed,
	multiplier,
	inputs
}: Recording): Promise<SavedRecordingResponse> {
	const body: SaveRecordingRequest = {
		simVersion,
		worldSeed,
		multiplier,
		inputs: toBase64(inputs)
	};
	return debugRequest<SavedRecordingResponse>("/api/debug/recordings", body);
}

/** The recording library, newest first. */
export async function listRecordings(): Promise<StoredRecording[]> {
	if (!DEBUG) throw new ApiError(0, "debug_disabled", "Debug controls require VITE_DEBUG=true");
	return (await request<{ recordings: StoredRecording[] }>("/api/debug/recordings", {}, false)).recordings;
}

/** One stored recording with its steering, to play again. */
export function getRecording(id: number): Promise<StoredRecordingDetail> {
	if (!DEBUG) throw new ApiError(0, "debug_disabled", "Debug controls require VITE_DEBUG=true");
	return request<StoredRecordingDetail>(`/api/debug/recordings/${id}`, {}, false);
}

/** Asks the server to re-simulate a stored recording and compare its hash and catch. */
export function verifyRecording(id: number): Promise<VerifyRecordingResponse> {
	return debugRequest<VerifyRecordingResponse>(`/api/debug/recordings/${id}/verify`);
}

export function getDebugState(): Promise<DebugStateResponse> {
	if (!DEBUG) throw new ApiError(0, "debug_disabled", "Debug controls require VITE_DEBUG=true");
	return request<DebugStateResponse>("/api/debug/state", {}, false);
}
