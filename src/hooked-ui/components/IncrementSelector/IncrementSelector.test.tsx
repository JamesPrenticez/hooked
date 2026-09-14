import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { IncrementSelector } from "./IncrementSelector";

const OPTIONS = [5, 10, 15, 20] as const;

const requiredProps = {
	options: OPTIONS,
	onValueChange: vi.fn(),
	"aria-label": "Increment"
} as const;

describe("IncrementSelector", () => {
	it("renders all options", () => {
		render(<IncrementSelector {...requiredProps} value={10} />);

		for (const option of OPTIONS) {
			expect(screen.getByText(String(option))).toBeInTheDocument();
		}
	});

	it("marks the selected option as checked", () => {
		render(<IncrementSelector {...requiredProps} value={10} />);

		expect(screen.getByRole("radio", { name: "10" })).toBeChecked();
		expect(screen.getByRole("radio", { name: "5" })).not.toBeChecked();
		expect(screen.getByRole("radio", { name: "20" })).not.toBeChecked();
	});

	it("moves the selection when a different value is passed", () => {
		const { rerender } = render(<IncrementSelector {...requiredProps} value={10} />);
		expect(screen.getByRole("radio", { name: "10" })).toBeChecked();

		rerender(<IncrementSelector {...requiredProps} value={20} />);

		expect(screen.getByRole("radio", { name: "10" })).not.toBeChecked();
		expect(screen.getByRole("radio", { name: "20" })).toBeChecked();
	});

	it("calls onValueChange with the picked option", async () => {
		const onValueChange = vi.fn();
		render(<IncrementSelector {...requiredProps} value={10} onValueChange={onValueChange} />);

		await userEvent.click(screen.getByText("20"));

		expect(onValueChange).toHaveBeenCalledWith(20);
	});

	it("renders a radiogroup with an accessible name", () => {
		render(<IncrementSelector {...requiredProps} value={10} aria-label="Bet size" />);

		expect(screen.getByRole("radiogroup", { name: "Bet size" })).toBeInTheDocument();
	});

	// Native radios are grouped by name. Two selectors sharing a name would
	// deselect each other, so the default must be unique per instance.
	it("gives each instance its own radio group", () => {
		render(
			<>
				<IncrementSelector {...requiredProps} value={10} aria-label="First" />
				<IncrementSelector {...requiredProps} value={20} aria-label="Second" />
			</>
		);

		const first = screen.getByRole("radiogroup", { name: "First" });
		const second = screen.getByRole("radiogroup", { name: "Second" });
		const nameOf = (group: HTMLElement) => group.querySelector<HTMLInputElement>('input[type="radio"]')?.name;

		expect(nameOf(first)).toBeTruthy();
		expect(nameOf(first)).not.toBe(nameOf(second));

		// Each group keeps its own selection.
		expect(first.querySelector<HTMLInputElement>('input[value="10"]')).toBeChecked();
		expect(second.querySelector<HTMLInputElement>('input[value="20"]')).toBeChecked();
	});

	it("participates in a form under the given name", () => {
		render(
			<form aria-label="bet">
				<IncrementSelector {...requiredProps} value={20} name="increment" />
			</form>
		);

		const form = screen.getByRole("form", { name: "bet" }) as HTMLFormElement;
		expect(new FormData(form).get("increment")).toBe("20");
	});

	it("does not submit a surrounding form when an option is clicked", async () => {
		const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
		render(
			<form onSubmit={onSubmit}>
				<IncrementSelector {...requiredProps} value={10} />
			</form>
		);

		await userEvent.click(screen.getByText("20"));

		expect(onSubmit).not.toHaveBeenCalled();
	});

	// Native radios expose the checked option as the group's single tab stop.
	it("makes the checked radio the group tab stop", async () => {
		render(<IncrementSelector {...requiredProps} value={10} />);

		await userEvent.tab();

		expect(screen.getByRole("radio", { name: "10" })).toHaveFocus();
	});

	it("merges a caller-supplied className without dropping its own", () => {
		render(<IncrementSelector {...requiredProps} value={10} className="my-layout" />);

		const group = screen.getByRole("radiogroup");
		expect(group).toHaveClass("my-layout");
		// The kit's own hashed class must survive alongside it.
		expect(group.className.split(" ")).toHaveLength(2);
	});

	// The extend-and-spread contract: undeclared props and the ref both land on
	// the root element.
	it("exposes its root via ref and spreads undeclared props onto it", () => {
		const ref = createRef<HTMLDivElement>();
		render(<IncrementSelector {...requiredProps} value={10} ref={ref} data-testid="selector" />);

		expect(ref.current).toBe(screen.getByTestId("selector"));
		expect(ref.current).toBe(screen.getByRole("radiogroup"));
	});
});
