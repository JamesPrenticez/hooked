import { beforeEach, expect, it, vi } from "vitest";

import { createSession, getBalance, getCurrent, setOnSessionExpired } from "./index";

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
