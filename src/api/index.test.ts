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
	refreshSession,
	setOnSessionExpired,
	startRound
} from "./index";

const fetchMock = vi.fn();
beforeEach(() => {
	fetchMock.mockReset();
	vi.stubGlobal("fetch", fetchMock);
});

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
