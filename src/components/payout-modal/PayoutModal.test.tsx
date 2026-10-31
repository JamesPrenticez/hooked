import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { useBalanceStore } from "@stores/balanceStore";
import { type RoundSnapshot, useRoundStore } from "@stores/roundStore";

import { AUTO_CLOSE_SECONDS, PayoutModal } from "./PayoutModal";

const round: RoundSnapshot = {
	roundId: "r1",
	status: "completed",
	stake: "1.00",
	volatility: "medium",
	market: [],
	bonus: [],
	outcome: { depth: "abyss", fish: "shrimp", tier: "epic", escaped: false, multiplier: "25.00" },
	payout: { total: "25.00", wagered: "1.00", net: "24.00" }
};

beforeEach(() => {
	vi.useFakeTimers();
	useBalanceStore.getState().setBalance("100.00", "EUR");
	useRoundStore.getState().setRound(round);
});
afterEach(() => {
	vi.useRealTimers();
	useRoundStore.getState().clearRound();
});

it("shows the fish, the payout, the multiplier and the slogan for the depth reached", () => {
	render(<PayoutModal onClose={vi.fn()} />);
	expect(screen.getByText("Shrimp")).toBeInTheDocument();
	expect(screen.getByText("€25.00")).toBeInTheDocument();
	expect(screen.getByText("×25")).toBeInTheDocument();
	expect(screen.getByText("Abyss conqueror!")).toBeInTheDocument();
});

it("closes itself after the countdown, not before", () => {
	const onClose = vi.fn();
	render(<PayoutModal onClose={onClose} />);

	for (let s = 1; s < AUTO_CLOSE_SECONDS; s++) act(() => vi.advanceTimersByTime(1000));
	expect(onClose).not.toHaveBeenCalled();
	expect(screen.getByRole("timer", { name: "Closing in 1 seconds" })).toBeInTheDocument();

	act(() => vi.advanceTimersByTime(1000));
	expect(onClose).toHaveBeenCalledOnce();
});

it("shows what a manual run caught, at the market's price for it, instead of the server's outcome", () => {
	useRoundStore.getState().setRound({ ...round, market: [{ fish: "sardine", multiplier: "0.25" }] });
	render(<PayoutModal onClose={vi.fn()} manual={{ fish: "sardine", depthM: 300 }} />);
	expect(screen.getByText("Sardine")).toBeInTheDocument();
	expect(screen.getByText("€0.25")).toBeInTheDocument();
	expect(screen.getByText("×0.25")).toBeInTheDocument();
	expect(screen.getByText("Fresh off the pier!")).toBeInTheDocument();
	expect(screen.queryByText("Shrimp")).not.toBeInTheDocument();
});

it("shows the Kraken for a run that ended on it, whatever fish the server chose", () => {
	useRoundStore.getState().setRound({ ...round, market: [{ fish: "kraken", multiplier: "100.00" }] });
	render(<PayoutModal onClose={vi.fn()} manual={{ fish: "kraken", depthM: 0 }} />);
	expect(screen.getByText("Kraken")).toBeInTheDocument();
	expect(screen.getByText("×100")).toBeInTheDocument();
});
