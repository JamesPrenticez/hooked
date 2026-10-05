import { beforeEach, expect, it } from "vitest";

import { FIRST_KRAKEN_ANIMATION } from "@constants/krakenAnimations";

import { useKrakenStore } from "./krakenStore";

beforeEach(() => {
	useKrakenStore.setState({
		forceTrench: false,
		cue: { animation: FIRST_KRAKEN_ANIMATION, id: 0 }
	});
});

it("starts on the encounter's first beat, with the trench not forced", () => {
	expect(useKrakenStore.getState().cue.animation).toBe(FIRST_KRAKEN_ANIMATION);
	expect(useKrakenStore.getState().forceTrench).toBe(false);
});

it("play switches the animation, and gives a fresh cue even for the one already running", () => {
	const { play } = useKrakenStore.getState();
	play("swats_full_body.side_swat");
	const first = useKrakenStore.getState().cue;
	play("swats_full_body.side_swat");
	const second = useKrakenStore.getState().cue;

	expect(second.animation).toBe("swats_full_body.side_swat");
	expect(second.id).not.toBe(first.id);
});
