import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { IconButton } from "./IconButton";
import { AudioFullIcon } from "../../icons";

describe("IconButton", () => {
	it("is a button named by its aria-label", () => {
		render(<IconButton icon={<AudioFullIcon aria-hidden="true" />} aria-label="Mute" />);

		expect(screen.getByRole("button", { name: "Mute" })).toBeInTheDocument();
	});

	it("calls onClick when pressed", async () => {
		const onClick = vi.fn();
		render(<IconButton icon={<AudioFullIcon aria-hidden="true" />} aria-label="Mute" onClick={onClick} />);

		await userEvent.click(screen.getByRole("button", { name: "Mute" }));

		expect(onClick).toHaveBeenCalledOnce();
	});

	it("does not fire when disabled", async () => {
		const onClick = vi.fn();
		render(<IconButton icon={<AudioFullIcon aria-hidden="true" />} aria-label="Mute" onClick={onClick} disabled />);

		await userEvent.click(screen.getByRole("button", { name: "Mute" }));

		expect(onClick).not.toHaveBeenCalled();
	});

	it("has no pressed state by default", () => {
		render(<IconButton icon={<AudioFullIcon aria-hidden="true" />} aria-label="Mute" />);

		expect(screen.getByRole("button", { name: "Mute" })).not.toHaveAttribute("aria-pressed");
	});

	it("reports aria-pressed when active", () => {
		render(<IconButton icon={<AudioFullIcon aria-hidden="true" />} aria-label="Mute" active />);

		expect(screen.getByRole("button", { name: "Mute" })).toHaveAttribute("aria-pressed", "true");
	});

	// type="button", so dropping it into a form must not submit the form.
	it("does not submit a surrounding form", async () => {
		const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
		render(
			<form onSubmit={onSubmit}>
				<IconButton icon={<AudioFullIcon aria-hidden="true" />} aria-label="Mute" />
			</form>
		);

		await userEvent.click(screen.getByRole("button", { name: "Mute" }));

		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("merges a caller-supplied className without dropping its own", () => {
		render(<IconButton icon={<AudioFullIcon aria-hidden="true" />} aria-label="Mute" className="my-layout" />);

		const button = screen.getByRole("button", { name: "Mute" });
		expect(button).toHaveClass("my-layout");
		// The kit's own hashed class must survive alongside it.
		expect(button.className.split(" ")).toHaveLength(2);
	});

	// The extend-and-spread contract: undeclared props and the ref both land on
	// the root element.
	it("exposes the button via ref and spreads undeclared props onto it", () => {
		const ref = createRef<HTMLButtonElement>();
		render(
			<IconButton icon={<AudioFullIcon aria-hidden="true" />} aria-label="Mute" ref={ref} data-testid="icon-button" />
		);

		expect(ref.current).toBe(screen.getByTestId("icon-button"));
		expect(ref.current).toBe(screen.getByRole("button", { name: "Mute" }));
	});
});
