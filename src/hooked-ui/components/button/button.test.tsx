import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "./Button";

describe("Button", () => {
	it("is a button named by its text content", () => {
		render(<Button>Place bet</Button>);

		expect(screen.getByRole("button", { name: "Place bet" })).toBeInTheDocument();
	});

	it("has no variant attribute by default", () => {
		render(<Button>Place bet</Button>);

		expect(screen.getByRole("button", { name: "Place bet" })).not.toHaveAttribute("data-variant");
	});

	it("renders the requested variant as a data-attribute", () => {
		render(<Button variant="negative">Cancel</Button>);

		expect(screen.getByRole("button", { name: "Cancel" })).toHaveAttribute("data-variant", "negative");
	});

	it("calls onClick when pressed", async () => {
		const onClick = vi.fn();
		render(<Button onClick={onClick}>Place bet</Button>);

		await userEvent.click(screen.getByRole("button", { name: "Place bet" }));

		expect(onClick).toHaveBeenCalledOnce();
	});

	it("does not fire when disabled", async () => {
		const onClick = vi.fn();
		render(
			<Button onClick={onClick} disabled>
				Place bet
			</Button>
		);

		await userEvent.click(screen.getByRole("button", { name: "Place bet" }));

		expect(onClick).not.toHaveBeenCalled();
	});

	// type="button", so dropping it into a form must not submit the form.
	it("does not submit a surrounding form", async () => {
		const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
		render(
			<form onSubmit={onSubmit}>
				<Button>Place bet</Button>
			</form>
		);

		await userEvent.click(screen.getByRole("button", { name: "Place bet" }));

		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("merges a caller-supplied className without dropping its own", () => {
		render(<Button className="my-layout">Place bet</Button>);

		const button = screen.getByRole("button", { name: "Place bet" });
		expect(button).toHaveClass("my-layout");
		// The kit's own hashed class must survive alongside it.
		expect(button.className.split(" ")).toHaveLength(3);
	});

	// The extend-and-spread contract: undeclared props and the ref both land on
	// the root element.
	it("exposes the button via ref and spreads undeclared props onto it", () => {
		const ref = createRef<HTMLButtonElement>();
		render(
			<Button ref={ref} data-testid="button">
				Place bet
			</Button>
		);

		expect(ref.current).toBe(screen.getByTestId("button"));
		expect(ref.current).toBe(screen.getByRole("button", { name: "Place bet" }));
	});
});
