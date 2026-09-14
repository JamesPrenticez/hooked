import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Checkbox } from "./Checkbox";

describe("Checkbox", () => {
	it("is a checkbox reporting its checked state", () => {
		render(<Checkbox value={true} onValueChange={vi.fn()} aria-label="Accept terms" />);

		expect(screen.getByRole("checkbox", { name: "Accept terms" })).toBeChecked();
	});

	it("reports unchecked when off", () => {
		render(<Checkbox value={false} onValueChange={vi.fn()} aria-label="Accept terms" />);

		expect(screen.getByRole("checkbox", { name: "Accept terms" })).not.toBeChecked();
	});

	it("calls onValueChange with the flipped value when clicked", async () => {
		const onValueChange = vi.fn();
		render(<Checkbox value={false} onValueChange={onValueChange} aria-label="Accept terms" />);

		await userEvent.click(screen.getByRole("checkbox", { name: "Accept terms" }));

		expect(onValueChange).toHaveBeenCalledWith(true);
	});

	it("does not fire when disabled", async () => {
		const onValueChange = vi.fn();
		render(<Checkbox value={false} onValueChange={onValueChange} aria-label="Accept terms" disabled />);

		await userEvent.click(screen.getByRole("checkbox", { name: "Accept terms" }));

		expect(onValueChange).not.toHaveBeenCalled();
	});

	it("is reachable and toggled by keyboard", async () => {
		const onValueChange = vi.fn();
		render(<Checkbox value={false} onValueChange={onValueChange} aria-label="Accept terms" />);

		await userEvent.tab();
		expect(screen.getByRole("checkbox", { name: "Accept terms" })).toHaveFocus();

		await userEvent.keyboard(" ");
		expect(onValueChange).toHaveBeenCalledWith(true);
	});

	it("merges a caller-supplied className without dropping its own", () => {
		render(<Checkbox value={false} onValueChange={vi.fn()} aria-label="Accept terms" className="my-layout" />);

		const checkbox = screen.getByRole("checkbox", { name: "Accept terms" });
		expect(checkbox).toHaveClass("my-layout");
		// The kit's own hashed class must survive alongside it.
		expect(checkbox.className.split(" ")).toHaveLength(2);
	});

	// The extend-and-spread contract: undeclared props and the ref both land on
	// the root element.
	it("exposes its root via ref and spreads undeclared props onto it", () => {
		const ref = createRef<HTMLInputElement>();
		render(
			<Checkbox value={false} onValueChange={vi.fn()} aria-label="Accept terms" ref={ref} data-testid="checkbox" />
		);

		expect(ref.current).toBe(screen.getByTestId("checkbox"));
		expect(ref.current).toBe(screen.getByRole("checkbox", { name: "Accept terms" }));
	});
});
