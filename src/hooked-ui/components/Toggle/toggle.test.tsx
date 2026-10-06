import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Toggle } from "./Toggle";

describe("Toggle", () => {
	it("is a switch reporting its checked state", () => {
		render(<Toggle value={true} onValueChange={vi.fn()} aria-label="Sound" />);

		expect(screen.getByRole("switch", { name: "Sound" })).toBeChecked();
	});

	it("reports unchecked when off", () => {
		render(<Toggle value={false} onValueChange={vi.fn()} aria-label="Sound" />);

		expect(screen.getByRole("switch", { name: "Sound" })).not.toBeChecked();
	});

	it("calls onValueChange with the flipped value when clicked", async () => {
		const onValueChange = vi.fn();
		render(<Toggle value={false} onValueChange={onValueChange} aria-label="Sound" />);

		await userEvent.click(screen.getByRole("switch", { name: "Sound" }));

		expect(onValueChange).toHaveBeenCalledWith(true);
	});

	it("does not fire when disabled", async () => {
		const onValueChange = vi.fn();
		render(<Toggle value={false} onValueChange={onValueChange} aria-label="Sound" disabled />);

		await userEvent.click(screen.getByRole("switch", { name: "Sound" }));

		expect(onValueChange).not.toHaveBeenCalled();
	});

	it("is reachable and toggled by keyboard", async () => {
		const onValueChange = vi.fn();
		render(<Toggle value={false} onValueChange={onValueChange} aria-label="Sound" />);

		await userEvent.tab();
		expect(screen.getByRole("switch", { name: "Sound" })).toHaveFocus();

		await userEvent.keyboard("{Enter}");
		expect(onValueChange).toHaveBeenCalledWith(true);
	});

	// The extend-and-spread contract: a caller's own onClick still runs, it
	// does not get silently replaced by the toggle's internal handler.
	it("composes a caller-supplied onClick rather than replacing it", async () => {
		const onClick = vi.fn();
		const onValueChange = vi.fn();
		render(<Toggle value={false} onValueChange={onValueChange} aria-label="Sound" onClick={onClick} />);

		await userEvent.click(screen.getByRole("switch", { name: "Sound" }));

		expect(onClick).toHaveBeenCalledOnce();
		expect(onValueChange).toHaveBeenCalledWith(true);
	});

	it("merges a caller-supplied className without dropping its own", () => {
		render(<Toggle value={false} onValueChange={vi.fn()} aria-label="Sound" className="my-layout" />);

		const toggle = screen.getByRole("switch", { name: "Sound" });
		expect(toggle).toHaveClass("my-layout");
		// The kit's own hashed class must survive alongside it.
		expect(toggle.className.split(" ")).toHaveLength(3);
	});

	// The extend-and-spread contract: undeclared props and the ref both land on
	// the root element.
	it("exposes its root via ref and spreads undeclared props onto it", () => {
		const ref = createRef<HTMLButtonElement>();
		render(<Toggle value={false} onValueChange={vi.fn()} aria-label="Sound" ref={ref} data-testid="toggle" />);

		expect(ref.current).toBe(screen.getByTestId("toggle"));
		expect(ref.current).toBe(screen.getByRole("switch", { name: "Sound" }));
	});
});
