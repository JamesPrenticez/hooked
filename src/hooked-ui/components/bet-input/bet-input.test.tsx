import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { BetInput } from "./bet-input";

const INCREMENTS = [5, 10, 25, 50, 100];

const requiredProps = {
	increments: INCREMENTS,
	onValueChange: vi.fn()
};

describe("BetInput", () => {
	it("renders the current value", () => {
		render(<BetInput {...requiredProps} value={10} />);

		expect(screen.getByText("10")).toBeInTheDocument();
	});

	it("steps to the next increment on increment click and the previous on decrement click", async () => {
		const onValueChange = vi.fn();
		render(<BetInput {...requiredProps} value={10} onValueChange={onValueChange} />);

		await userEvent.click(screen.getByRole("button", { name: "+" }));
		expect(onValueChange).toHaveBeenLastCalledWith(25);

		await userEvent.click(screen.getByRole("button", { name: "−" }));
		expect(onValueChange).toHaveBeenLastCalledWith(5);
	});

	it("disables decrement at the lowest increment and increment at the highest", () => {
		const { rerender } = render(<BetInput {...requiredProps} value={5} />);
		expect(screen.getByRole("button", { name: "−" })).toBeDisabled();

		rerender(<BetInput {...requiredProps} value={100} />);
		expect(screen.getByRole("button", { name: "+" })).toBeDisabled();
	});

	it("does not render a quick-select popup by default", () => {
		render(<BetInput {...requiredProps} value={10} />);

		expect(screen.queryByRole("button", { name: "25" })).not.toBeInTheDocument();
	});

	it("opens the quick-select popup when the value is clicked and quickSelect is enabled", async () => {
		render(<BetInput {...requiredProps} value={10} quickSelect />);

		await userEvent.click(screen.getByRole("button", { name: "10" }));

		expect(screen.getByRole("button", { name: "25" })).toBeInTheDocument();
	});

	it("picks a value from the quick-select popup and closes it", async () => {
		const onValueChange = vi.fn();
		render(<BetInput {...requiredProps} value={10} onValueChange={onValueChange} quickSelect />);

		await userEvent.click(screen.getByRole("button", { name: "10" }));
		await userEvent.click(screen.getByRole("button", { name: "50" }));

		expect(onValueChange).toHaveBeenCalledWith(50);
		expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
	});

	it("closes the quick-select popup on an outside click", async () => {
		render(
			<div>
				<BetInput {...requiredProps} value={10} quickSelect />
				<button type="button">outside</button>
			</div>
		);

		await userEvent.click(screen.getByRole("button", { name: "10" }));
		expect(screen.getByRole("button", { name: "50" })).toBeInTheDocument();

		await userEvent.click(screen.getByRole("button", { name: "outside" }));
		expect(screen.queryByRole("button", { name: "50" })).not.toBeInTheDocument();
	});

	it("does not open the popup when disabled", async () => {
		render(<BetInput {...requiredProps} value={10} quickSelect disabled />);

		await userEvent.click(screen.getByText("10"));

		expect(screen.queryByRole("button", { name: "50" })).not.toBeInTheDocument();
	});

	it("formats the displayed value", () => {
		render(<BetInput {...requiredProps} value={10} format={v => `$${v}`} />);

		expect(screen.getByText("$10")).toBeInTheDocument();
	});

	it("merges a caller-supplied className without dropping its own", () => {
		render(<BetInput {...requiredProps} value={10} className="my-layout" data-testid="bet-input" />);

		const wrapper = screen.getByTestId("bet-input");
		expect(wrapper).toHaveClass("my-layout");
	});

	it("exposes its root via ref and spreads undeclared props onto it", () => {
		const ref = createRef<HTMLDivElement>();
		render(<BetInput {...requiredProps} value={10} ref={ref} data-testid="bet-input" />);

		expect(ref.current).toBe(screen.getByTestId("bet-input"));
	});
});
