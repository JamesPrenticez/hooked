import { act, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";

import { useHookStore } from "@stores/hookStore";
import { extractionTicks, gearsFor } from "@utils/simExtraction";
import { createSim } from "@utils/simStep";

import { ExtractionMultiplier } from "./ExtractionMultiplier";

const CATCH_M = 2400;

afterEach(() => act(() => useHookStore.setState({ sim: undefined })));

function land(multiplier: number, tick: number, phase: "extract" | "descend" = "extract") {
	act(() =>
		useHookStore.setState({
			sim: {
				...createSim(1),
				phase,
				multiplier,
				catchM: CATCH_M,
				phaseTick: 0,
				tick
			}
		})
	);
}

it("shows nothing outside a landing, or while the hook is still being hauled up", () => {
	render(<ExtractionMultiplier />);
	land(60, 0, "descend");
	expect(screen.queryByRole("status")).not.toBeInTheDocument();
	land(60, 0);
	expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

it("ends on the catch's own multiplier once it is all out of the water", () => {
	render(<ExtractionMultiplier />);
	land(62, extractionTicks(gearsFor(62), CATCH_M));
	expect(screen.getByRole("status")).toHaveTextContent("×62");
});
