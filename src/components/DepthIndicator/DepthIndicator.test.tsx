import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { DEPTH_ZONES } from "@constants/depthZones";

import DepthIndicator from "./DepthIndicator";

it("shows Shallow and 0m at the surface", () => {
	render(<DepthIndicator depth={0} />);

	expect(screen.getByText("Shallow")).toBeInTheDocument();
	expect(screen.getByText("0m")).toBeInTheDocument();
});

it("shows the zone label and rounded, grouped depth", () => {
	const [, , deep] = DEPTH_ZONES;
	render(<DepthIndicator depth={deep.fromMeters + 34.6} />);

	expect(screen.getByText("Deep")).toBeInTheDocument();
	expect(screen.getByText(`${(deep.fromMeters + 35).toLocaleString("en-US")}m`)).toBeInTheDocument();
});
