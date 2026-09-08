import { beforeEach, expect, it } from "vitest";

import type { RoundSnapshot } from "./roundStore";
import { useRoundStore } from "./roundStore";

const OPEN: RoundSnapshot = {
	roundId: "r1",
	status: "open",
	bets: [{ type: "depth", selection: "shallow", amount: "1.00", won: false, multiplier: "0.00", payout: "0.00" }],
	outcome: { depth: "deep", fish: "shark", tier: "epic" },
	payout: { total: "0.00", wagered: "1.00", net: "-1.00" }
};

beforeEach(() => {
	useRoundStore.setState({ round: null });
});

it("starts empty — nothing to present until the server opens a round", () => {
	expect(useRoundStore.getState().round).toBeNull();
});

it("setRound mirrors the server's round verbatim", () => {
	useRoundStore.getState().setRound(OPEN);
	expect(useRoundStore.getState().round).toBe(OPEN);
});

it("setRound replaces wholesale — start then settle, no merge", () => {
	useRoundStore.getState().setRound(OPEN);
	const settled: RoundSnapshot = {
		...OPEN,
		status: "completed",
		bets: [{ ...OPEN.bets[0], won: true, multiplier: "2.00", payout: "2.00" }],
		payout: { total: "2.00", wagered: "1.00", net: "1.00" }
	};
	useRoundStore.getState().setRound(settled);
	expect(useRoundStore.getState().round).toBe(settled);
});

it("clearRound drops back to no active round", () => {
	useRoundStore.getState().setRound(OPEN);
	useRoundStore.getState().clearRound();
	expect(useRoundStore.getState().round).toBeNull();
});
