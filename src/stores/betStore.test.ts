import { beforeEach, expect, it } from "vitest";

import { selectTotalCents, toWireBets, useBetStore } from "./betStore";

beforeEach(() => {
	useBetStore.setState({ chip: 100, bets: {} });
});

it("toggle bets the selection at the current chip, and removes it on a second tap", () => {
	const { toggle } = useBetStore.getState();
	toggle("depth", "shallow");
	expect(useBetStore.getState().bets).toEqual({ "depth:shallow": 100 });

	toggle("depth", "shallow");
	expect(useBetStore.getState().bets).toEqual({});
});

it("each selection keeps the chip it was placed with", () => {
	const { toggle, setChip } = useBetStore.getState();
	toggle("depth", "shallow");
	setChip(10);
	toggle("fish", "shark");

	const state = useBetStore.getState();
	expect(state.bets).toEqual({ "depth:shallow": 100, "fish:shark": 10 });
	expect(selectTotalCents(state)).toBe(110);
});

it("a depth and a fish of the same name are separate bets", () => {
	const { toggle } = useBetStore.getState();
	toggle("depth", "deep");
	toggle("fish", "deep");
	expect(Object.keys(useBetStore.getState().bets)).toHaveLength(2);
});

it("clear removes every bet but keeps the chip", () => {
	const { toggle, setChip, clear } = useBetStore.getState();
	setChip(500);
	toggle("depth", "reef");
	clear();
	expect(useBetStore.getState()).toMatchObject({ chip: 500, bets: {} });
});

it("toWireBets emits decimal-string amounts", () => {
	expect(toWireBets({ "depth:shallow": 1050, "fish:blue-cod": 10 })).toEqual([
		{ type: "depth", selection: "shallow", amount: "10.50" },
		{ type: "fish", selection: "blue-cod", amount: "0.10" }
	]);
});
