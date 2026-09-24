import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { BonusButton } from "./BonusButton";

describe("BonusButton", () => {
	it("is a button named by its label", () => {
		render(<BonusButton label="Free spins" />);

		expect(screen.getByRole("button", { name: "Free spins" })).toBeInTheDocument();
	});

	it("calls onClick when pressed", async () => {
		const onClick = vi.fn();
		render(<BonusButton label="Bonus" onClick={onClick} />);

		await userEvent.click(screen.getByRole("button", { name: "Bonus" }));

		expect(onClick).toHaveBeenCalledOnce();
	});

	it("does not fire when disabled", async () => {
		const onClick = vi.fn();
		render(<BonusButton label="Bonus" disabled onClick={onClick} />);

		await userEvent.click(screen.getByRole("button", { name: "Bonus" }));

		expect(onClick).not.toHaveBeenCalled();
	});

	// type="button", so dropping it into a form must not submit the form.
	it("does not submit a surrounding form", async () => {
		const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
		render(
			<form onSubmit={onSubmit}>
				<BonusButton label="Bonus" />
			</form>
		);

		await userEvent.click(screen.getByRole("button", { name: "Bonus" }));

		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("merges a caller-supplied className without dropping its own", () => {
		render(<BonusButton label="Bonus" className="my-layout" />);

		const button = screen.getByRole("button", { name: "Bonus" });
		expect(button).toHaveClass("my-layout");
		// The kit's own hashed class must survive alongside it.
		expect(button.className.split(" ")).toHaveLength(3);
	});

	// The extend-and-spread contract: undeclared props and the ref both land on
	// the root element.
	it("exposes the button via ref and spreads undeclared props onto it", () => {
		const ref = createRef<HTMLButtonElement>();
		render(<BonusButton label="Bonus" ref={ref} data-testid="bonus" />);

		expect(ref.current).toBe(screen.getByTestId("bonus"));
		expect(ref.current).toBe(screen.getByRole("button", { name: "Bonus" }));
	});
});
