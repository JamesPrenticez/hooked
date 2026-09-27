import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

import { useBetStore } from "@stores/betStore";

import { BottomBar } from "./BottomBar";

beforeEach(() => {
	useBetStore.setState({ chip: 100, bets: {} });
});

const openTargets = () => fireEvent.click(screen.getByRole("button", { name: /select targets/i }));

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

it("opens the select targets modal and closes it again", () => {
	render(<BottomBar descending={false} onCast={() => {}} />);

	expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

	openTargets();
	expect(screen.getByRole("dialog", { name: /select targets/i })).toBeInTheDocument();

	fireEvent.click(screen.getByRole("button", { name: "Close" }));
	expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

it("a depth bet and a fish bet add up in the total, and Clear empties it", () => {
	render(<BottomBar descending={false} onCast={() => {}} />);
	expect(screen.getByText("$0.00")).toBeInTheDocument();

	openTargets();
	fireEvent.click(screen.getByRole("button", { name: "Shallow" }));
	fireEvent.click(screen.getByRole("button", { name: "Shark (deep)" }));
	expect(screen.getByRole("button", { name: "Shallow" })).toHaveAttribute("aria-pressed", "true");
	expect(screen.getByText("$2.00")).toBeInTheDocument();

	fireEvent.click(screen.getByRole("button", { name: "Clear" }));
	expect(screen.getByText("$0.00")).toBeInTheDocument();
});

it("tapping a bet tile again removes it", () => {
	render(<BottomBar descending={false} onCast={() => {}} />);

	openTargets();
	const reef = screen.getByRole("button", { name: "Reef" });

	fireEvent.click(reef);
	fireEvent.click(reef);

	expect(reef).toHaveAttribute("aria-pressed", "false");
});

it("shows a badge for each active target and locks the trigger while descending", () => {
	const { rerender } = render(<BottomBar descending={false} onCast={() => {}} />);

	openTargets();
	fireEvent.click(screen.getByRole("button", { name: "Shallow" }));
	fireEvent.click(screen.getByRole("button", { name: "Reef" }));

	expect(screen.getByRole("button", { name: /select targets/i })).toHaveTextContent("2");

	rerender(<BottomBar descending onCast={() => {}} />);
	expect(screen.getByRole("button", { name: /select targets/i })).toBeDisabled();
});
