import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Stepper } from "./Stepper";

const requiredProps = {
	orientation: "horizontal" as const,
	value: 10,
	format: (value: number) => String(value),
	disabled: false,
	atMin: false,
	atMax: false,
	decLabel: "−",
	incLabel: "+",
	clickable: false,
	onIncrement: vi.fn(),
	onDecrement: vi.fn(),
	onValueClick: vi.fn()
};

describe("Stepper", () => {
	it("renders the formatted value and label", () => {
		render(<Stepper {...requiredProps} label="Bet" />);

		expect(screen.getByText("10")).toBeInTheDocument();
		expect(screen.getByText("Bet")).toBeInTheDocument();
	});

	it("calls onIncrement and onDecrement when their buttons are clicked", async () => {
		const onIncrement = vi.fn();
		const onDecrement = vi.fn();
		render(<Stepper {...requiredProps} onIncrement={onIncrement} onDecrement={onDecrement} />);

		await userEvent.click(screen.getByRole("button", { name: "+" }));
		await userEvent.click(screen.getByRole("button", { name: "−" }));

		expect(onIncrement).toHaveBeenCalledTimes(1);
		expect(onDecrement).toHaveBeenCalledTimes(1);
	});

	it("disables the decrement button at the minimum and the increment button at the maximum", () => {
		const { rerender } = render(<Stepper {...requiredProps} atMin />);
		expect(screen.getByRole("button", { name: "−" })).toBeDisabled();
		expect(screen.getByRole("button", { name: "+" })).not.toBeDisabled();

		rerender(<Stepper {...requiredProps} atMax />);
		expect(screen.getByRole("button", { name: "+" })).toBeDisabled();
		expect(screen.getByRole("button", { name: "−" })).not.toBeDisabled();
	});

	it("disables both buttons when disabled", () => {
		render(<Stepper {...requiredProps} disabled />);

		expect(screen.getByRole("button", { name: "−" })).toBeDisabled();
		expect(screen.getByRole("button", { name: "+" })).toBeDisabled();
	});

	it("renders the value as a static block when not clickable", () => {
		render(<Stepper {...requiredProps} clickable={false} />);

		expect(screen.queryByRole("button", { name: "10" })).not.toBeInTheDocument();
		expect(screen.getByText("10")).toBeInTheDocument();
	});

	it("renders the value as a button and calls onValueClick when clickable", async () => {
		const onValueClick = vi.fn();
		render(<Stepper {...requiredProps} clickable onValueClick={onValueClick} />);

		await userEvent.click(screen.getByRole("button", { name: "10" }));

		expect(onValueClick).toHaveBeenCalledTimes(1);
	});

	it("groups the increment and decrement buttons together in vertical orientation", () => {
		render(<Stepper {...requiredProps} orientation="vertical" />);

		expect(screen.getByRole("button", { name: "+" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "−" })).toBeInTheDocument();
	});

	it("merges a caller-supplied className without dropping its own", () => {
		render(<Stepper {...requiredProps} className="my-layout" data-testid="stepper" />);

		const container = screen.getByTestId("stepper");
		expect(container).toHaveClass("my-layout");
		expect(container.className.split(" ")).toHaveLength(3);
	});

	it("exposes its root via ref and spreads undeclared props onto it", () => {
		const ref = createRef<HTMLDivElement>();
		render(<Stepper {...requiredProps} ref={ref} data-testid="stepper" />);

		expect(ref.current).toBe(screen.getByTestId("stepper"));
	});
});
