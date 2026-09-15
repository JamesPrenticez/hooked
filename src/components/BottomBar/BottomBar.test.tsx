import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import BottomBar from "./BottomBar";

it("calls onCast when the button is tapped", () => {
	const onCast = vi.fn();
	render(<BottomBar descending={false} onCast={onCast} />);

	fireEvent.click(screen.getByRole("button", { name: /cast line/i }));

	expect(onCast).toHaveBeenCalledOnce();
});

it("reads Surface and is pressed while descending", () => {
	render(<BottomBar descending onCast={() => {}} />);

	const button = screen.getByRole("button", { name: /surface/i });
	expect(button).toHaveAttribute("aria-pressed", "true");
});
