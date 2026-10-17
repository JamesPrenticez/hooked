import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { LoadingScreen } from "./LoadingScreen";

it("shows the logo, a progress bar and a starting progress of 0%", () => {
	render(<LoadingScreen progress={0} />);

	expect(screen.getByAltText("Hooked")).toBeInTheDocument();
	expect(screen.getByRole("progressbar", { name: "Loading" })).toBeInTheDocument();
	expect(screen.getByText("0%")).toBeInTheDocument();
});

it("reports the asset load progress as a percentage", () => {
	render(<LoadingScreen progress={0.3} />);

	expect(screen.getByText("30%")).toBeInTheDocument();
});
