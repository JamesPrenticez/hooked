import { act, render, screen, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

import { getMarket } from "@api";
import { useRoundStore } from "@stores/roundStore";
import { roundSnapshot } from "@utils/roundFixture";

import { MarketBoard } from "./MarketBoard";

vi.mock("@api", () => ({ getMarket: vi.fn() }));

beforeEach(() => {
	useRoundStore.setState({ round: null });
	vi.mocked(getMarket).mockRejectedValue(new Error("offline"));
});

it("is an empty sign until the market arrives", () => {
	render(<MarketBoard />);

	expect(screen.getByRole("region", { name: "Fish market" })).toBeInTheDocument();
	expect(screen.getByText("Loading prices…")).toBeInTheDocument();
	expect(screen.queryByRole("list")).not.toBeInTheDocument();
});

it("lists every fish and its price, a row per depth zone", () => {
	useRoundStore.setState({ round: roundSnapshot() });
	render(<MarketBoard />);

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
	const { container } = render(<MarketBoard />);
	expect(container.querySelector("[data-caught]")).toBeNull();

	act(() => useRoundStore.setState({ round: roundSnapshot({ status: "completed" }) }));
	expect(container.querySelector("[data-caught]")).toHaveAttribute("data-fish", "sardine");
});

it("keeps showing the last round's prices after it, and swaps them for the next round's", () => {
	useRoundStore.setState({ round: roundSnapshot({ status: "completed" }) });
	const { container } = render(<MarketBoard />);
	expect(container.querySelector('[data-fish="sardine"]')).toHaveTextContent("×0.25");

	const market = roundSnapshot().market.map(e => (e.fish === "sardine" ? { ...e, multiplier: "12.35" } : e));
	act(() => useRoundStore.setState({ round: roundSnapshot({ market }) }));
	expect(container.querySelector('[data-fish="sardine"]')).toHaveTextContent("×12.35");
});

it("stocks the idle sign from the fixed market, before any round", async () => {
	vi.mocked(getMarket).mockResolvedValue(roundSnapshot().market);
	render(<MarketBoard />);

	expect(await screen.findByRole("region", { name: "Reef" })).toBeInTheDocument();
	expect(getMarket).toHaveBeenCalledWith("medium");
});

it("lights the round's bonus fish with what they pay on top, and no others", () => {
	useRoundStore.setState({ round: roundSnapshot({ bonus: [{ fish: "shrimp", multiplier: "888.00" }] }) });
	const { container } = render(<MarketBoard />);

	const lit = container.querySelectorAll("[data-bonus]");
	expect(lit).toHaveLength(1);
	expect(lit[0]).toHaveAttribute("data-fish", "shrimp");
	expect(lit[0]).toHaveTextContent("+888×");
});
