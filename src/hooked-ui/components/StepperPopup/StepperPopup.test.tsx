import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { StepperPopup } from "./StepperPopup";

const requiredProps = {
	values: [5, 10, 25, 50],
	value: 10,
	format: (value: number) => String(value),
	isOpen: true,
	onValueSelect: vi.fn(),
	onClose: vi.fn(),
	growFromInput: true,
	growDirection: "up" as const,
	anchor: null
};

describe("StepperPopup", () => {
	it("renders every value in the grid", () => {
		render(<StepperPopup {...requiredProps} />);

		for (const value of requiredProps.values) {
			expect(screen.getByRole("button", { name: String(value) })).toBeInTheDocument();
		}
	});

	it("marks the selected value as pressed", () => {
		render(<StepperPopup {...requiredProps} value={25} />);

		expect(screen.getByRole("button", { name: "25" })).toHaveAttribute("aria-pressed", "true");
		expect(screen.getByRole("button", { name: "10" })).toHaveAttribute("aria-pressed", "false");
	});

	it("calls onValueSelect with the clicked value", async () => {
		const onValueSelect = vi.fn();
		render(<StepperPopup {...requiredProps} onValueSelect={onValueSelect} />);

		await userEvent.click(screen.getByRole("button", { name: "50" }));

		expect(onValueSelect).toHaveBeenCalledWith(50);
	});

	it("calls onClose when the close button is clicked", async () => {
		const onClose = vi.fn();
		render(<StepperPopup {...requiredProps} onClose={onClose} />);

		await userEvent.click(screen.getByRole("button", { name: "Close" }));

		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it("renders the label", () => {
		render(<StepperPopup {...requiredProps} label="Bet" />);

		expect(screen.getByText("BET")).toBeInTheDocument();
	});

	it("renders nothing when growFromInput is false, not open, and has no anchor", () => {
		const { container } = render(
			<StepperPopup {...requiredProps} growFromInput={false} isOpen={false} anchor={null} />
		);

		expect(container).toBeEmptyDOMElement();
	});

	it("renders in a portal when growFromInput is false and an anchor is set", () => {
		render(
			<StepperPopup
				{...requiredProps}
				growFromInput={false}
				anchor={{ bottom: 40, centerX: 100 }}
				data-testid="popup"
			/>
		);

		const popup = screen.getByTestId("popup");
		expect(popup.parentElement).toBe(document.body);
	});

	it("merges a caller-supplied className without dropping its own", () => {
		render(<StepperPopup {...requiredProps} className="my-layout" data-testid="popup" />);

		const popup = screen.getByTestId("popup");
		expect(popup).toHaveClass("my-layout");
	});

	it("exposes its root via ref when rendered inline", () => {
		const ref = createRef<HTMLDivElement>();
		render(<StepperPopup {...requiredProps} ref={ref} data-testid="popup" />);

		expect(ref.current).toBe(screen.getByTestId("popup"));
	});
});
