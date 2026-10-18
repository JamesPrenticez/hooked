import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { FISH } from "@constants/fish";
import { useRoundStore } from "@stores/roundStore";
import { roundSnapshot } from "@utils/roundFixture";

import { dealMs } from "./marketLayout";
import { MarketReveal } from "./MarketReveal";

beforeEach(() => {
	vi.useFakeTimers();
	useRoundStore.setState({ round: roundSnapshot() });
});

afterEach(() => {
	vi.useRealTimers();
	useRoundStore.setState({ round: null });
});

const dialog = () => screen.getByRole("dialog", { name: "New fish market prices" });
const panel = () => dialog().firstElementChild as HTMLElement;

it("deals the whole market onto a board, every fish with its price", () => {
	render(<MarketReveal onDone={() => {}} />);

	expect(dialog()).toBeInTheDocument();
	expect(screen.getByRole("heading", { name: "Fish market" })).toBeInTheDocument();
	expect(screen.getAllByRole("listitem")).toHaveLength(FISH.length);
	expect(screen.getByRole("img", { name: "Sardine" }).closest("li")).toHaveTextContent("×0.25");
});

it("settles onto the dock board by itself once the last chip has landed and the prices have been read", () => {
	const onDone = vi.fn();
	render(<MarketReveal onDone={onDone} />);

	// Not before the deal is over…
	act(() => vi.advanceTimersByTime(dealMs(FISH.length) - 1));
	expect(onDone).not.toHaveBeenCalled();

	// …then it holds a moment and flies to the board; the cast starts when it gets there.
	act(() => vi.advanceTimersByTime(2_000));
	expect(onDone).not.toHaveBeenCalled();
	act(() => vi.advanceTimersByTime(600));
	expect(onDone).toHaveBeenCalledOnce();
});

it("a tap skips the wait, and finishing twice casts once", () => {
	const onDone = vi.fn();
	render(<MarketReveal onDone={onDone} />);

	fireEvent.click(dialog());
	fireEvent.click(dialog());
	expect(onDone).not.toHaveBeenCalled(); // it still has to fly to the board
	act(() => vi.advanceTimersByTime(600));
	expect(onDone).toHaveBeenCalledOnce();

	// The auto-advance timer, left to run, doesn't cast a second time.
	act(() => vi.advanceTimersByTime(10_000));
	expect(onDone).toHaveBeenCalledOnce();
});

it.each(["Escape", "Enter", " "])("the %j key skips the wait too", key => {
	const onDone = vi.fn();
	render(<MarketReveal onDone={onDone} />);

	fireEvent.keyDown(document, { key });
	act(() => vi.advanceTimersByTime(600));
	expect(onDone).toHaveBeenCalledOnce();
});

it("fades away when there is no dock board to land on", () => {
	render(<MarketReveal onDone={() => {}} />);
	fireEvent.click(dialog());
	expect(panel()).toHaveStyle({ opacity: "0" });
});

it("shrinks onto the dock board when there is one", () => {
	const board = document.createElement("section");
	board.setAttribute("data-market-board", "");
	board.getBoundingClientRect = () => ({ left: 10, top: 20, width: 100, height: 80 }) as DOMRect;
	document.body.append(board);

	render(<MarketReveal onDone={() => {}} />);
	fireEvent.click(dialog());
	expect(panel().style.transform).toMatch(/translate\(.*\) scale\(/);

	board.remove();
});
