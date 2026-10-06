import { createRef } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Accordion } from "./Accordion";

describe("Accordion", () => {
	it("is closed by default", () => {
		const { container } = render(<Accordion title="Hook">Body</Accordion>);

		expect(container.querySelector("details")).not.toHaveAttribute("open");
	});

	it("starts expanded when open is passed", () => {
		const { container } = render(
			<Accordion title="Hook" open>
				Body
			</Accordion>
		);

		expect(container.querySelector("details")).toHaveAttribute("open");
	});

	it("toggles open and closed when the title is clicked", async () => {
		const { container } = render(<Accordion title="Hook">Body</Accordion>);
		const details = container.querySelector("details");

		await userEvent.click(screen.getByText("Hook"));
		expect(details).toHaveAttribute("open");

		await userEvent.click(screen.getByText("Hook"));
		expect(details).not.toHaveAttribute("open");
	});

	it("renders its children", () => {
		render(
			<Accordion title="Hook" open>
				Body
			</Accordion>
		);

		expect(screen.getByText("Body")).toBeInTheDocument();
	});

	it("merges a caller-supplied className without dropping its own", () => {
		const { container } = render(
			<Accordion title="Hook" className="my-layout">
				Body
			</Accordion>
		);

		const details = container.querySelector("details");
		expect(details).toHaveClass("my-layout");
		expect(details?.className.split(" ")).toHaveLength(3);
	});

	it("exposes its root via ref and spreads undeclared props onto it", () => {
		const ref = createRef<HTMLDetailsElement>();
		render(
			<Accordion title="Hook" ref={ref} data-testid="accordion">
				Body
			</Accordion>
		);

		expect(ref.current).toBe(screen.getByTestId("accordion"));
	});
});
