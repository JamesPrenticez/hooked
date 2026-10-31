import { beforeEach, expect, it } from "vitest";

import { toWireStart, useBetStore } from "./betStore";

beforeEach(() => {
	useBetStore.setState({ chip: 100, volatility: "medium" });
});

it("starts at a $1.00 stake on medium volatility", () => {
	expect(useBetStore.getState()).toMatchObject({ chip: 100, volatility: "medium" });
});

it("the stake and the volatility change independently", () => {
	const { setChip, setVolatility } = useBetStore.getState();
	setChip(500);
	expect(useBetStore.getState()).toMatchObject({ chip: 500, volatility: "medium" });

	setVolatility("high");
	expect(useBetStore.getState()).toMatchObject({ chip: 500, volatility: "high" });
});

it("toWireStart emits the stake as a decimal string and the volatility as it is", () => {
	expect(toWireStart({ chip: 1050, volatility: "low" })).toEqual({ stake: "10.50", volatility: "low" });
	expect(toWireStart({ chip: 10, volatility: "high" })).toEqual({ stake: "0.10", volatility: "high" });
});
