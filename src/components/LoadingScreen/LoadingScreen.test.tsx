import { act } from "react";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { MIN_LOADING_MS } from "@constants/config";

import { LoadingScreen } from "./LoadingScreen";

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
});

it("shows the logo, a progress bar and a starting progress of 0%", () => {
	render(<LoadingScreen progress={0} />);

	expect(screen.getByAltText("Hooked")).toBeInTheDocument();
	expect(screen.getByRole("progressbar", { name: "Loading" })).toBeInTheDocument();
	expect(screen.getByText("0%")).toBeInTheDocument();
});

it("holds a finished load back until the minimum display time has run", () => {
	render(<LoadingScreen progress={1} />);

	act(() => {
		vi.advanceTimersByTime(MIN_LOADING_MS / 2);
	});
	expect(screen.getByText("50%")).toBeInTheDocument();

	act(() => {
		vi.advanceTimersByTime(MIN_LOADING_MS);
	});
	expect(screen.getByText("100%")).toBeInTheDocument();
});

it("follows a slow load rather than the ramp", () => {
	render(<LoadingScreen progress={0.3} />);

	act(() => {
		vi.advanceTimersByTime(MIN_LOADING_MS);
	});
	expect(screen.getByText("30%")).toBeInTheDocument();
});
