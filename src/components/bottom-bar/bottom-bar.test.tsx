import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

import { useBetStore } from "@stores/betStore";
import { useHookStore } from "@stores/hookStore";
import { useRoundStore } from "@stores/roundStore";
import { extractionTicks, gearsFor } from "@utils/simExtraction";
import { createSim } from "@utils/simStep";

import { BottomBar } from "./bottom-bar";

beforeEach(() => {
	useBetStore.setState({ chip: 100, bets: {} });
	useRoundStore.setState({ round: null });
});

const openTargets = () => fireEvent.click(screen.getByRole("button", { name: /select targets/i }));

it("calls onCast when the button is tapped", () => {
	const onCast = vi.fn();
	render(<BottomBar descending={false} onCast={onCast} />);

	fireEvent.click(screen.getByRole("button", { name: /cast line/i }));

	expect(onCast).toHaveBeenCalledOnce();
});

it("reads Surface and is pressed while descending", () => {
	render(<BottomBar descending onCast={() => {}} />);

	const button = screen.getByRole("button", { name: /surface/i });
	expect(button).toHaveAttribute("aria-pressed", "true");
});

it("opens the select targets modal and closes it again", () => {
	render(<BottomBar descending={false} onCast={() => {}} />);

	expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

	openTargets();
	expect(screen.getByRole("dialog", { name: /select targets/i })).toBeInTheDocument();

	fireEvent.click(screen.getByRole("button", { name: "Close" }));
	expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("opens the bonus modal from the Bonus button, closes it again, and returns focus to the button", () => {
	render(<BottomBar descending={false} onCast={() => {}} />);
	const trigger = screen.getByRole("button", { name: "Bonus" });
	expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

	trigger.focus();
	fireEvent.click(trigger);
	expect(screen.getByRole("dialog", { name: "Bonus" })).toBeInTheDocument();

	fireEvent.click(screen.getByRole("button", { name: "Close" }));
	expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	expect(trigger).toHaveFocus();
});

it("locks the Bonus button while descending", () => {
	render(<BottomBar descending onCast={() => {}} />);

	expect(screen.getByRole("button", { name: "Bonus" })).toBeDisabled();
});

it("a depth bet and a fish bet add up in the total", () => {
	render(<BottomBar descending={false} onCast={() => {}} />);
	expect(screen.getByText("$0.00")).toBeInTheDocument();

	openTargets();
	fireEvent.click(screen.getByRole("button", { name: "Shallow" }));
	fireEvent.click(screen.getByRole("button", { name: "Shark (deep)" }));
	expect(screen.getByRole("button", { name: "Shallow" })).toHaveAttribute("aria-pressed", "true");
	expect(screen.getByText("$2.00")).toBeInTheDocument();
});

it("tapping a bet tile again removes it", () => {
	render(<BottomBar descending={false} onCast={() => {}} />);

	openTargets();
	const reef = screen.getByRole("button", { name: "Reef" });

	fireEvent.click(reef);
	fireEvent.click(reef);

	expect(reef).toHaveAttribute("aria-pressed", "false");
});

it("shows a badge for each active target and locks the trigger while descending", () => {
	const { rerender } = render(<BottomBar descending={false} onCast={() => {}} />);

	openTargets();
	fireEvent.click(screen.getByRole("button", { name: "Shallow" }));
	fireEvent.click(screen.getByRole("button", { name: "Reef" }));

	expect(screen.getByRole("button", { name: /select targets/i })).toHaveTextContent("2");

	rerender(<BottomBar descending onCast={() => {}} />);
	expect(screen.getByRole("button", { name: /select targets/i })).toBeDisabled();
});

it("opens the chip quick-select popup and picks a value from it", () => {
	render(<BottomBar descending={false} onCast={() => {}} />);

	fireEvent.click(screen.getByRole("button", { name: /^bet/i }));
	fireEvent.click(screen.getByRole("button", { name: "$5.00" }));

	expect(useBetStore.getState().chip).toBe(500);
});

const roundPaying = (total: string) => ({
	roundId: "r1",
	status: "open" as const,
	bets: [],
	outcome: { depth: "shallow" as const, fish: "sardine", tier: "small" as const },
	payout: { total, wagered: "1.00", net: "0" }
});

/** Lands a ×62 catch with the stake on Shallow and the server's payout for the round set to `total`. */
function landWithServerPayout(total: string) {
	render(<BottomBar descending={false} onCast={() => {}} />);
	openTargets();
	fireEvent.click(screen.getByRole("button", { name: "Shallow" }));
	expect(screen.getByText("Total bet")).toBeInTheDocument();

	const multiplier = 62;
	const sim = { ...createSim(1), phase: "extract" as const, multiplier, catchM: 2400, phaseTick: 0 };
	act(() => {
		useRoundStore.setState({ round: roundPaying(total) });
		useHookStore.setState({ sim: { ...sim, tick: extractionTicks(gearsFor(multiplier), sim.catchM) } });
	});
	expect(screen.getByText("Payout")).toBeInTheDocument();
}

it("turns the total into the server's payout once the catch is being landed", () => {
	landWithServerPayout("2.13");
	expect(screen.getByText("$2.13")).toBeInTheDocument();
	act(() => useHookStore.setState({ sim: undefined }));
});

it("shows no payout for a round the server settled as a loss", () => {
	landWithServerPayout("0.00");
	expect(screen.getByText("$0.00")).toBeInTheDocument();
	act(() => useHookStore.setState({ sim: undefined }));
});
