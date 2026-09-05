// The single wire boundary (ARCHITECTURE.md §7). This is the ONLY file in src/
// that knows the server's URLs and envelope. Stores and components call the
// typed helpers below — they never call fetch or see a wire shape.
//
// None of these helpers are wired into the app yet — that starts with the
// Loading Screen milestone (5). This milestone only defines the contract.

import { API_BASE_URL } from "@/constants/config";
import type {
	BalanceResponse,
	Bet,
	CurrentResponse,
	ErrorBody,
	HistoryResponse,
	PlayResponse,
	RoundDetailResponse,
	RoundResult,
	SessionResponse
} from "@/types/api";

let sessionToken: string | null = null;

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
		if (res.status === 401) onSessionExpired?.();
		throw new ApiError(res.status, err?.code ?? "unknown", err?.message ?? res.statusText);
	}
	return data as T;
}

export async function createSession(): Promise<SessionResponse> {
	const session = await request<SessionResponse>("/api/session", { method: "POST" }, false);
	sessionToken = session.sessionToken;
	return session;
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
	sessionToken = token;
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
	sessionToken = session.sessionToken;
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
