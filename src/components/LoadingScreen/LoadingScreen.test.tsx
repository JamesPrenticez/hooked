import { act } from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import LoadingScreen from "./LoadingScreen";

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

it("shows the logo, a loading indicator and a starting progress of 0%", () => {
	render(<LoadingScreen />);

	expect(screen.getByAltText("Hooked")).toBeInTheDocument();
	expect(screen.getByRole("status", { name: "Loading" })).toBeInTheDocument();
	expect(screen.getByText("0%")).toBeInTheDocument();
});

it("advances the progress display as the load ramps", () => {
	render(<LoadingScreen />);

	act(() => {
		vi.advanceTimersByTime(1000);
	});

	const pct = Number((screen.getByText(/%$/).textContent ?? "").replace("%", ""));
	expect(pct).toBeGreaterThan(0);
});

it("settles at 100% once the ramp completes", () => {
	render(<LoadingScreen />);

	act(() => {
		vi.advanceTimersByTime(10000);
	});

	expect(screen.getByText("100%")).toBeInTheDocument();
});
