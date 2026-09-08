import { beforeEach, expect, it, vi } from "vitest";

import type { Bet } from "@/types/api";

import {
	adoptSessionTokenFromUrl,
	completeRound,
	createSession,
	getBalance,
	getCurrent,
	getHistory,
	getRound,
	initSession,
	refreshSession,
	setOnSessionExpired,
	startRound
} from "./index";

const fetchMock = vi.fn();
beforeEach(() => {
	fetchMock.mockReset();
	vi.stubGlobal("fetch", fetchMock);
	localStorage.clear();
	window.history.pushState({}, "", "/");
});

const bearerOf = (callIndex: number) => (fetchMock.mock.calls[callIndex][1].headers as Headers).get("authorization");

const jsonRes = (status: number, body: unknown) => ({
	ok: status >= 200 && status < 300,
	status,
	statusText: "",
	json: async () => body
});

it("createSession stores the token and later calls send it as a bearer header", async () => {
	fetchMock.mockResolvedValueOnce(
		jsonRes(200, { sessionToken: "tok-1", playerId: "p1", currency: "USD", balance: "1000.00" })
	);
	const session = await createSession();
	expect(session.sessionToken).toBe("tok-1");

	fetchMock.mockResolvedValueOnce(jsonRes(200, { balance: "1000.00", currency: "USD" }));
	await getBalance();
	const headers = fetchMock.mock.calls[1][1].headers as Headers;
	expect(headers.get("authorization")).toBe("Bearer tok-1");
});

it("a 401 fires the session-expired callback and throws", async () => {
	const expired = vi.fn();
	setOnSessionExpired(expired);
	fetchMock.mockResolvedValueOnce(jsonRes(401, { error: { code: "invalid_session", message: "nope" } }));
	await expect(getCurrent()).rejects.toThrow("nope");
	expect(expired).toHaveBeenCalledOnce();
});

it("a network failure normalizes to an ApiError without firing session-expired", async () => {
	const expired = vi.fn();
	setOnSessionExpired(expired);
	fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
	await expect(getBalance()).rejects.toMatchObject({ code: "network_error" });
	expect(expired).not.toHaveBeenCalled();
});

it("refreshSession rotates the stored token", async () => {
	fetchMock.mockResolvedValueOnce(
		jsonRes(200, { sessionToken: "tok-2", playerId: "p1", currency: "USD", balance: "1000.00" })
	);
	const refreshed = await refreshSession();
	expect(refreshed.sessionToken).toBe("tok-2");

	fetchMock.mockResolvedValueOnce(jsonRes(200, { balance: "1000.00", currency: "USD" }));
	await getBalance();
	const headers = fetchMock.mock.calls[1][1].headers as Headers;
	expect(headers.get("authorization")).toBe("Bearer tok-2");
});

it("adoptSessionTokenFromUrl adopts and strips the token, keeping other params", async () => {
	window.history.pushState({}, "", "/?sessionToken=abc123&other=1");
	expect(adoptSessionTokenFromUrl()).toBe(true);
	expect(window.location.search).toBe("?other=1");

	fetchMock.mockResolvedValueOnce(jsonRes(200, { balance: "1000.00", currency: "USD" }));
	await getBalance();
	const headers = fetchMock.mock.calls[0][1].headers as Headers;
	expect(headers.get("authorization")).toBe("Bearer abc123");
});

it("adoptSessionTokenFromUrl returns false when no token is present", () => {
	window.history.pushState({}, "", "/?other=1");
	expect(adoptSessionTokenFromUrl()).toBe(false);
});

it("startRound wraps bets in the start envelope and resolves to the result", async () => {
	const bets: Bet[] = [{ type: "depth", selection: "shallow", amount: "5.00" }];
	const result = {
		roundId: "r1",
		outcome: { depth: "shallow", fish: "x", tier: "small" },
		bets: [],
		payout: { total: "0.00", wagered: "5.00" },
		metadata: { balance: "0" }
	};
	fetchMock.mockResolvedValueOnce(jsonRes(200, { roundId: "r1", message: result }));

	expect(await startRound(bets)).toEqual(result);
	const [url, init] = fetchMock.mock.calls[0];
	expect(url).toContain("/api/game/play");
	expect(JSON.parse(init.body as string)).toEqual({ message: { start: { bets } } });
});

it("completeRound wraps the roundId in the complete envelope", async () => {
	const result = {
		roundId: "r1",
		outcome: { depth: "shallow", fish: "x", tier: "small" },
		bets: [],
		payout: { total: "0.00", wagered: "5.00" },
		metadata: { balance: "0" }
	};
	fetchMock.mockResolvedValueOnce(jsonRes(200, { roundId: "r1", message: result }));

	expect(await completeRound("r1")).toEqual(result);
	const [, init] = fetchMock.mock.calls[0];
	expect(JSON.parse(init.body as string)).toEqual({ message: { complete: { roundId: "r1" } } });
});

it("a second play call is rejected while the first is still in flight (§4.4)", async () => {
	let release!: (v: unknown) => void;
	fetchMock.mockImplementationOnce(() => new Promise(r => (release = r)));

	const first = startRound([{ type: "depth", selection: "shallow", amount: "5.00" }]);
	await expect(completeRound("r1")).rejects.toMatchObject({ code: "request_in_flight" });

	release(
		jsonRes(200, {
			roundId: "r1",
			message: { roundId: "r1", outcome: {}, bets: [], payout: {}, metadata: { balance: "0" } }
		})
	);
	await first;
	expect(fetchMock).toHaveBeenCalledOnce();

	// lock released — a later call goes through
	fetchMock.mockResolvedValueOnce(jsonRes(200, { roundId: "r1", message: { roundId: "r1" } }));
	await completeRound("r1");
	expect(fetchMock).toHaveBeenCalledTimes(2);
});

it("getRound requests the round detail endpoint", async () => {
	fetchMock.mockResolvedValueOnce(
		jsonRes(200, {
			roundId: "r1",
			status: "completed",
			outcome: { depth: "shallow", fish: "x", tier: "small" },
			bets: [],
			payout: { total: "0.00", wagered: "5.00" }
		})
	);
	const detail = await getRound("r1");
	expect(detail.status).toBe("completed");
	expect(fetchMock.mock.calls[0][0]).toContain("/api/game/round/r1");
});

it("getHistory requests the history endpoint", async () => {
	fetchMock.mockResolvedValueOnce(jsonRes(200, { rounds: [] }));
	expect(await getHistory()).toEqual({ rounds: [] });
	expect(fetchMock.mock.calls[0][0]).toContain("/api/game/history");
});

// --- Session lifecycle (BUILD_PLAN §4.1) ---

const current = (body: Partial<Record<string, unknown>> = {}) =>
	jsonRes(200, { balance: "1000.00", currency: "USD", active: false, ...body });

it("createSession persists the token to localStorage; a 401 clears it", async () => {
	fetchMock.mockResolvedValueOnce(
		jsonRes(200, { sessionToken: "tok-1", playerId: "p1", currency: "USD", balance: "1000.00" })
	);
	await createSession();
	expect(localStorage.getItem("deepcatch.sessionToken")).toBe("tok-1");

	fetchMock.mockResolvedValueOnce(jsonRes(401, { error: { code: "invalid_session", message: "nope" } }));
	await expect(getBalance()).rejects.toThrow("nope");
	expect(localStorage.getItem("deepcatch.sessionToken")).toBeNull();
});

it("initSession adopts a launch-URL token and strips it, then reads current state", async () => {
	window.history.pushState({}, "", "/?sessionToken=url-tok");
	fetchMock.mockResolvedValueOnce(current());

	const state = await initSession();

	expect(state.balance).toBe("1000.00");
	expect(window.location.search).toBe("");
	expect(localStorage.getItem("deepcatch.sessionToken")).toBe("url-tok");
	expect(fetchMock.mock.calls[0][0]).toContain("/api/game/current");
	expect(bearerOf(0)).toBe("Bearer url-tok");
});

it("initSession restores a persisted token without minting a new session", async () => {
	localStorage.setItem("deepcatch.sessionToken", "stored-tok");
	fetchMock.mockResolvedValueOnce(current({ active: true, roundId: "r9", bets: [] }));

	const state = await initSession();

	expect(state.roundId).toBe("r9");
	expect(fetchMock).toHaveBeenCalledOnce();
	expect(bearerOf(0)).toBe("Bearer stored-tok");
});

it("initSession mints a fresh session when the persisted token is expired", async () => {
	localStorage.setItem("deepcatch.sessionToken", "stale-tok");
	fetchMock
		.mockResolvedValueOnce(jsonRes(401, { error: { code: "invalid_session", message: "expired" } }))
		.mockResolvedValueOnce(
			jsonRes(200, { sessionToken: "fresh-tok", playerId: "p2", currency: "USD", balance: "1000.00" })
		)
		.mockResolvedValueOnce(current());

	await initSession();

	expect(fetchMock.mock.calls[1][0]).toContain("/api/session");
	expect(bearerOf(2)).toBe("Bearer fresh-tok");
	expect(localStorage.getItem("deepcatch.sessionToken")).toBe("fresh-tok");
});

it("initSession mints a fresh session when nothing is stored", async () => {
	fetchMock
		.mockResolvedValueOnce(
			jsonRes(200, { sessionToken: "new-tok", playerId: "p3", currency: "USD", balance: "1000.00" })
		)
		.mockResolvedValueOnce(current());

	await initSession();

	expect(fetchMock.mock.calls[0][0]).toContain("/api/session");
	expect(fetchMock.mock.calls[1][0]).toContain("/api/game/current");
});

it("initSession propagates a non-401 failure while validating a restored token", async () => {
	localStorage.setItem("deepcatch.sessionToken", "stored-tok");
	fetchMock.mockResolvedValueOnce(jsonRes(500, { error: { code: "server_error", message: "boom" } }));

	await expect(initSession()).rejects.toThrow("boom");
	expect(fetchMock).toHaveBeenCalledOnce();
});
