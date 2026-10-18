import { beforeEach, expect, it, vi } from "vitest";

import { useBalanceStore } from "@stores/balanceStore";
import { useRoundStore } from "@stores/roundStore";
import { roundSnapshot } from "@utils/roundFixture";

import { recoverFromServer, setInflightRoundId } from "./roundRecovery";

const fetchMock = vi.fn();
const jsonRes = (status: number, body: unknown) => ({
	ok: status >= 200 && status < 300,
	status,
	statusText: "",
	json: async () => body
});

beforeEach(() => {
	fetchMock.mockReset();
	vi.stubGlobal("fetch", fetchMock);
	localStorage.clear();
	useBalanceStore.setState({ balance: null, currency: null });
	useRoundStore.setState({ round: null });
});

const CURRENT = { balance: "990.00", currency: "USD", active: false };

const detail = (status: "open" | "completed") => ({
	...roundSnapshot({ status }),
	seed: { serverSeedHash: "h", clientSeed: "c", nonce: 1 }
});

it("mirrors the balance and clears the round when nothing is active", async () => {
	setInflightRoundId("stale");
	await recoverFromServer({ ...CURRENT });

	expect(useBalanceStore.getState().balance).toBe("990.00");
	expect(useRoundStore.getState().round).toBeNull();
	expect(localStorage.getItem("deepcatch.roundId")).toBeNull();
});

it("resumes an active round from full detail and persists its id", async () => {
	fetchMock.mockResolvedValueOnce(jsonRes(200, detail("open")));

	await recoverFromServer({ ...CURRENT, active: true, roundId: "r1" });

	expect(fetchMock.mock.calls[0][0]).toContain("/api/game/round/r1");
	// The market and the catch come back with it, so the board can be redrawn and the dive resumed.
	expect(useRoundStore.getState().round).toEqual(roundSnapshot({ status: "open" }));
	expect(localStorage.getItem("deepcatch.roundId")).toBe("r1");
});

it("recovers a round that settled while the client was away", async () => {
	setInflightRoundId("r1");
	fetchMock.mockResolvedValueOnce(jsonRes(200, detail("completed")));

	await recoverFromServer({ ...CURRENT }); // server no longer reports it as active

	expect(useRoundStore.getState().round).toMatchObject({
		roundId: "r1",
		status: "completed"
	});
});

it("drops a stale in-flight id that no longer resolves", async () => {
	setInflightRoundId("gone");
	fetchMock.mockResolvedValueOnce(jsonRes(404, { error: { code: "round_not_found", message: "no" } }));

	await recoverFromServer({ ...CURRENT });

	expect(useRoundStore.getState().round).toBeNull();
	expect(localStorage.getItem("deepcatch.roundId")).toBeNull();
});

it("fetches its own current state on a bare reconnect", async () => {
	fetchMock.mockResolvedValueOnce(jsonRes(200, { balance: "5.00", currency: "USD", active: false }));

	await recoverFromServer();

	expect(fetchMock.mock.calls[0][0]).toContain("/api/game/current");
	expect(useBalanceStore.getState().balance).toBe("5.00");
});
