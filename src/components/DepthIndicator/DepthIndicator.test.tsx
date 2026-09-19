import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { DEPTH_DISPLAY_STEP, DEPTH_ZONES } from "@constants/depthZones";

import DepthIndicator from "./DepthIndicator";

const STEP = DEPTH_DISPLAY_STEP;
const shown = (meters: number) => `${meters.toLocaleString("en-US")}m`;

it("shows Shallow and 0m at the surface", () => {
	render(<DepthIndicator depth={0} />);

	expect(screen.getByText("Shallow")).toBeInTheDocument();
	expect(screen.getByText("0m")).toBeInTheDocument();
});

it("shows the zone label and grouped depth floored to the display step", () => {
	const [, , deep] = DEPTH_ZONES;
	const depth = deep.fromMeters + STEP * 0.7;
	render(<DepthIndicator depth={depth} />);

	expect(screen.getByText("Deep")).toBeInTheDocument();
	expect(screen.getByText(shown(Math.floor(depth / STEP) * STEP))).toBeInTheDocument();
});

it("holds at the last step mark until the next is reached", () => {
	const { rerender } = render(<DepthIndicator depth={STEP * 3 - 0.1} />);
	expect(screen.getByText(shown(STEP * 2))).toBeInTheDocument();

	rerender(<DepthIndicator depth={STEP * 3} />);
	expect(screen.getByText(shown(STEP * 3))).toBeInTheDocument();
});
