import { act } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

import { useBalanceStore } from "@stores/balanceStore";

import { Balance } from "./Balance";

// The ease is covered by useAnimatedNumber.test.ts — stub it to identity here
// so these assert the display logic (null guard, formatting, store reactivity)
// synchronously.
vi.mock("@hooks/useAnimatedNumber", () => ({
	useAnimatedNumber: (n: number) => n
}));

beforeEach(() => {
	useBalanceStore.setState({ balance: null, currency: null });
});

it("renders nothing until the first balance arrives", () => {
	const { container } = render(<Balance />);
	expect(container).toBeEmptyDOMElement();
});

it("shows the balance formatted in its currency", () => {
	useBalanceStore.setState({ balance: "1000.00", currency: "USD" });
	render(<Balance />);

	expect(screen.getByText("Balance")).toBeInTheDocument();
	expect(screen.getByText("$1,000.00")).toBeInTheDocument();
});

it("reflects a later balance update from the store", () => {
	render(<Balance />);
	act(() => {
		useBalanceStore.setState({ balance: "1272.40", currency: "USD" });
	});
	expect(screen.getByText("$1,272.40")).toBeInTheDocument();
});
