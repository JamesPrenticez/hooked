import { act, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";

import { ESCAPE_PHRASES } from "@constants/escapePhrases";
import { useHookStore } from "@stores/hookStore";
import { ANNOUNCE_TICKS } from "@utils/simExtraction";
import { createSim, type SimPhase } from "@utils/simStep";

import { HookedBanner } from "./HookedBanner";

afterEach(() => act(() => useHookStore.setState({ sim: undefined })));

function setSim(phase: SimPhase, ticksIn = 0) {
	act(() =>
		useHookStore.setState({
			sim: { ...createSim(1), phase, tick: ticksIn, phaseTick: 0 }
		})
	);
}

it("says nothing until a fish is hooked", () => {
	render(<HookedBanner />);
	expect(screen.queryByText("HOOKED!")).not.toBeInTheDocument();

	setSim("descend");
	expect(screen.queryByText("HOOKED!")).not.toBeInTheDocument();
});

it("splashes HOOKED! for the announce phase only", () => {
	render(<HookedBanner />);

	setSim("hooked");
	expect(screen.queryByText("HOOKED!")).not.toBeInTheDocument();

	setSim("announce", 1);
	expect(screen.getByText("HOOKED!")).toBeInTheDocument();

	setSim("ascend");
	expect(screen.queryByText("HOOKED!")).not.toBeInTheDocument();
});

it("holds the word at full strength in the middle of the phase and fades it out by the end", () => {
	render(<HookedBanner />);

	setSim("announce", ANNOUNCE_TICKS / 2);
	expect(screen.getByText("HOOKED!")).toHaveStyle({ opacity: "1" });

	setSim("announce", ANNOUNCE_TICKS - 1);
	expect(Number(screen.getByText("HOOKED!").style.opacity)).toBeLessThan(0.2);
});

it("says one of the escape phrases instead of HOOKED! when the fish gets away", () => {
	render(<HookedBanner />);
	act(() =>
		useHookStore.setState({ sim: { ...createSim(7, 1, undefined, true), phase: "announce", tick: 1, phaseTick: 0 } })
	);
	expect(screen.queryByText("HOOKED!")).not.toBeInTheDocument();
	expect(screen.getByText(ESCAPE_PHRASES[7 % ESCAPE_PHRASES.length])).toBeInTheDocument();
});
