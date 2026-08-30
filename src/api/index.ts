// The single wire boundary (ARCHITECTURE.md §7). This is the ONLY file in src/
// that knows the server's URLs and envelope. Stores and components call the
// typed helpers below — they never call fetch or see a wire shape.
//
// Foundation milestone: session bootstrap + authoritative reads. The
// { message: { … } } play envelope and the refresh timer land in later
// milestones.

import { API_BASE_URL } from "@/constants/config";
import type { BalanceResponse, CurrentResponse, ErrorBody, SessionResponse } from "@/types/api";

let sessionToken: string | null = null;

/** Notified when the server rejects our token. Consumed by StoreSync (§7). */
export let onSessionExpired: (() => void) | null = null;
export function setOnSessionExpired(fn: () => void) {
	onSessionExpired = fn;
}

class ApiError extends Error {
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

	const res = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
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

export function getBalance(): Promise<BalanceResponse> {
	return request<BalanceResponse>("/api/game/balance");
}

export function getCurrent(): Promise<CurrentResponse> {
	return request<CurrentResponse>("/api/game/current", { method: "POST" });
}
