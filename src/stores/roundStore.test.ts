import { beforeEach, expect, it } from "vitest";

import { roundSnapshot } from "@utils/roundFixture";

import { useRoundStore } from "./roundStore";

const OPEN = roundSnapshot();

beforeEach(() => {
	useRoundStore.setState({ round: null });
});

it("starts empty — nothing to present until the server opens a round", () => {
	expect(useRoundStore.getState().round).toBeNull();
});

it("setRound mirrors the server's round verbatim, market and all", () => {
	useRoundStore.getState().setRound(OPEN);
	expect(useRoundStore.getState().round).toBe(OPEN);
	expect(useRoundStore.getState().round?.market).toBe(OPEN.market);
});

it("setRound replaces wholesale — start then settle, no merge", () => {
	useRoundStore.getState().setRound(OPEN);
	const settled = roundSnapshot({ status: "completed", payout: { total: "0.25", wagered: "1.00", net: "-0.75" } });
	useRoundStore.getState().setRound(settled);
	expect(useRoundStore.getState().round).toBe(settled);
});

it("clearRound drops back to no active round", () => {
	useRoundStore.getState().setRound(OPEN);
	useRoundStore.getState().clearRound();
	expect(useRoundStore.getState().round).toBeNull();
});
