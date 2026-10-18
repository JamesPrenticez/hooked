import { act, render, screen, within } from "@testing-library/react";
import { beforeEach, expect, it } from "vitest";

import { useRoundStore } from "@stores/roundStore";
import { roundSnapshot } from "@utils/roundFixture";

import { MarketBoard } from "./MarketBoard";

beforeEach(() => {
	useRoundStore.setState({ round: null });
});

it("is an empty sign until the first cast posts prices", () => {
	render(<MarketBoard hidden={false} />);

	expect(screen.getByRole("region", { name: "Fish market" })).toBeInTheDocument();
	expect(screen.getByText("Prices are posted when you cast.")).toBeInTheDocument();
	expect(screen.queryByRole("list")).not.toBeInTheDocument();
});

it("lists every fish and its price, a row per depth zone", () => {
	useRoundStore.setState({ round: roundSnapshot() });
	render(<MarketBoard hidden={false} />);

	for (const zone of ["Shallow", "Reef", "Deep", "Abyss", "Jackpot"]) {
		expect(screen.getByRole("region", { name: zone })).toBeInTheDocument();
	}
	// The sardine is worth 0.25× in the fixture's market; every other fish 1×.
	const shallow = screen.getByRole("region", { name: "Shallow" });
	expect(within(shallow).getByRole("img", { name: "Sardine" }).closest("li")).toHaveTextContent("×0.25");
	expect(within(shallow).getByRole("img", { name: "Shrimp" }).closest("li")).toHaveTextContent("×1");
	// The Kraken is the jackpot row's only fish.
	expect(within(screen.getByRole("region", { name: "Jackpot" })).getAllByRole("listitem")).toHaveLength(1);
});

it("rings the fish the round landed once it is over, and not before", () => {
	useRoundStore.setState({ round: roundSnapshot({ status: "open" }) });
	const { container } = render(<MarketBoard hidden={false} />);
	expect(container.querySelector("[data-caught]")).toBeNull();

	act(() => useRoundStore.setState({ round: roundSnapshot({ status: "completed" }) }));
	expect(container.querySelector("[data-caught]")).toHaveAttribute("data-fish", "sardine");
});

it("keeps showing the last round's prices after it, and swaps them for the next round's", () => {
	useRoundStore.setState({ round: roundSnapshot({ status: "completed" }) });
	const { container } = render(<MarketBoard hidden={false} />);
	expect(container.querySelector('[data-fish="sardine"]')).toHaveTextContent("×0.25");

	const market = roundSnapshot().market.map(e => (e.fish === "sardine" ? { ...e, multiplier: "12.35" } : e));
	act(() => useRoundStore.setState({ round: roundSnapshot({ market }) }));
	expect(container.querySelector('[data-fish="sardine"]')).toHaveTextContent("×12.35");
});

it("is present but hidden while the hook is down or the prices are being dealt", () => {
	useRoundStore.setState({ round: roundSnapshot() });
	const { container, rerender } = render(<MarketBoard hidden />);
	expect(container.querySelector("[data-market-board]")).toHaveAttribute("data-hidden");

	rerender(<MarketBoard hidden={false} />);
	expect(container.querySelector("[data-market-board]")).not.toHaveAttribute("data-hidden");
});
