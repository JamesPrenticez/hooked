import { beforeEach, expect, it } from "vitest";

import { useBalanceStore } from "./balanceStore";

beforeEach(() => {
	useBalanceStore.setState({ balance: null, currency: null });
});

it("starts empty — nothing to show until the server provides a balance", () => {
	expect(useBalanceStore.getState().balance).toBeNull();
	expect(useBalanceStore.getState().currency).toBeNull();
});

it("setBalance stores the server figure and its currency together", () => {
	useBalanceStore.getState().setBalance("1000.00", "USD");
	expect(useBalanceStore.getState()).toMatchObject({ balance: "1000.00", currency: "USD" });
});

it("setBalance replaces the previous figure — it never accumulates a delta", () => {
	useBalanceStore.getState().setBalance("1000.00", "USD");
	useBalanceStore.getState().setBalance("990.00", "USD");
	expect(useBalanceStore.getState().balance).toBe("990.00");
});
