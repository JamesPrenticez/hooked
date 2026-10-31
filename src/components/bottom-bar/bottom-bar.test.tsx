import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

import { useBetStore } from "@stores/betStore";
import { useHookStore } from "@stores/hookStore";
import { useRoundStore } from "@stores/roundStore";
import { roundSnapshot } from "@utils/roundFixture";
import { extractionTicks, gearsFor } from "@utils/simExtraction";
import { createSim } from "@utils/simStep";

import { BottomBar } from "./bottom-bar";

beforeEach(() => {
	useBetStore.setState({ chip: 100, volatility: "medium" });
	useRoundStore.setState({ round: null });
});

const volatilityButton = () => screen.getByRole("button", { name: /^volatility/i });

it("calls onCast when the button is tapped", () => {
	const onCast = vi.fn();
	render(<BottomBar descending={false} onCast={onCast} />);

	fireEvent.click(screen.getByRole("button", { name: /cast line/i }));

	expect(onCast).toHaveBeenCalledOnce();
});

it("opens the fish market from its button, even mid-cast, and closes it again", () => {
	render(<BottomBar descending onCast={() => {}} />);

	fireEvent.click(screen.getByRole("button", { name: "Fish market" }));
	expect(screen.getByRole("dialog", { name: "Fish market" })).toBeInTheDocument();

	fireEvent.keyDown(document, { key: "Escape" });
	expect(screen.queryByRole("dialog", { name: "Fish market" })).not.toBeInTheDocument();
});

it("reads Cash out and is pressed while descending", () => {
	render(<BottomBar descending onCast={() => {}} />);

	const button = screen.getByRole("button", { name: /cash out/i });
	expect(button).toHaveAttribute("aria-pressed", "true");
});

it("names the volatility the next cast is made at", () => {
	render(<BottomBar descending={false} onCast={() => {}} />);
	expect(volatilityButton()).toHaveAccessibleName("Volatility, Medium");

	act(() => useBetStore.setState({ volatility: "high" }));
	expect(volatilityButton()).toHaveAccessibleName("Volatility, High");
});

it("opens the volatility modal and closes it again", () => {
	render(<BottomBar descending={false} onCast={() => {}} />);

	expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

	fireEvent.click(volatilityButton());
	const dialog = screen.getByRole("dialog", { name: "Volatility" });
	expect(dialog).toBeInTheDocument();
	// All three levels are laid out to read before choosing, the current one pressed.
	expect(screen.getByRole("button", { name: /^low/i })).toHaveAttribute("aria-pressed", "false");
	expect(screen.getByRole("button", { name: /^medium/i })).toHaveAttribute("aria-pressed", "true");
	expect(screen.getByRole("button", { name: /^high/i })).toHaveAttribute("aria-pressed", "false");

	fireEvent.click(screen.getByRole("button", { name: "Close" }));
	expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	expect(useBetStore.getState().volatility).toBe("medium");
});

it("picking a volatility applies it and closes the modal", () => {
	render(<BottomBar descending={false} onCast={() => {}} />);

	fireEvent.click(volatilityButton());
	fireEvent.click(screen.getByRole("button", { name: /^high/i }));

	expect(useBetStore.getState().volatility).toBe("high");
	expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	expect(volatilityButton()).toHaveAccessibleName("Volatility, High");
});

it("Escape closes the volatility modal without changing it", () => {
	render(<BottomBar descending={false} onCast={() => {}} />);

	fireEvent.click(volatilityButton());
	fireEvent.keyDown(document, { key: "Escape" });

	expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	expect(useBetStore.getState().volatility).toBe("medium");
});

it("locks the volatility trigger while descending", () => {
	render(<BottomBar descending onCast={() => {}} />);

	expect(volatilityButton()).toBeDisabled();
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

it("shows the stake as the total, and follows it as the stake changes", () => {
	render(<BottomBar descending={false} onCast={() => {}} />);
	expect(screen.getByText("Total bet")).toBeInTheDocument();
	expect(screen.getAllByText("$1.00").length).toBeGreaterThan(0);

	act(() => useBetStore.setState({ chip: 500 }));
	expect(screen.getAllByText("$5.00").length).toBeGreaterThan(0);
});

it("opens the stake quick-select popup and picks a value from it", () => {
	render(<BottomBar descending={false} onCast={() => {}} />);

	fireEvent.click(screen.getByRole("button", { name: /^bet/i }));
	fireEvent.click(screen.getByRole("button", { name: "$5.00" }));

	expect(useBetStore.getState().chip).toBe(500);
});

/** Lands a ×62 catch with the server's payout for the round set to `total`. */
function landWithServerPayout(total: string) {
	render(<BottomBar descending={false} onCast={() => {}} />);
	expect(screen.getByText("Total bet")).toBeInTheDocument();

	const multiplier = 62;
	const sim = { ...createSim(1), phase: "extract" as const, multiplier, catchM: 2400, phaseTick: 0 };
	act(() => {
		useRoundStore.setState({ round: roundSnapshot({ payout: { total, wagered: "1.00", net: "0" } }) });
		useHookStore.setState({ sim: { ...sim, tick: extractionTicks(gearsFor(multiplier), sim.catchM) } });
	});
	expect(screen.getByText("Payout")).toBeInTheDocument();
}

it("turns the total into the server's payout once the catch is being landed", () => {
	landWithServerPayout("2.13");
	expect(screen.getByText("$2.13")).toBeInTheDocument();
	act(() => useHookStore.setState({ sim: undefined }));
});

it("shows a catch worth less than the stake as the payout it is, from the first moment of the landing", () => {
	render(<BottomBar descending={false} onCast={() => {}} />);
	const multiplier = 0.25;
	act(() => {
		useRoundStore.setState({ round: roundSnapshot() });
		useHookStore.setState({
			sim: { ...createSim(1), phase: "extract", multiplier, catchM: 2400, phaseTick: 0, tick: 400 }
		});
	});

	expect(screen.getByText("Payout")).toBeInTheDocument();
	expect(screen.getByText("$0.25")).toBeInTheDocument();
	act(() => useHookStore.setState({ sim: undefined }));
});

it("shows no payout for a round the server settled at nothing", () => {
	landWithServerPayout("0.00");
	expect(screen.getByText("$0.00")).toBeInTheDocument();
	act(() => useHookStore.setState({ sim: undefined }));
});
