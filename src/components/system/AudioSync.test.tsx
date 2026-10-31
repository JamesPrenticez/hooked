import { act, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { useHookStore } from "@stores/hookStore";
import { createSim } from "@utils/simStep";
import { MUSIC, SFX } from "@utils/sound";

import { AudioSync } from "./AudioSync";

const sound = vi.hoisted(() => ({ playMusic: vi.fn(), playSfx: vi.fn(), stopSfx: vi.fn(), setMuted: vi.fn() }));
vi.mock("@utils/sound", async importOriginal => ({ ...(await importOriginal<object>()), ...sound }));

afterEach(() => {
	act(() => useHookStore.setState({ sim: undefined }));
	vi.clearAllMocks();
});

const setSim = (patch: object) => act(() => useHookStore.setState({ sim: { ...createSim(1), ...patch } }));

it("plays the surface theme, then the deep theme once the camera is deep", () => {
	render(<AudioSync payoutOpen={false} />);
	expect(sound.playMusic).toHaveBeenLastCalledWith(MUSIC.beachway);

	setSim({ cameraM: 5000 });
	expect(sound.playMusic).toHaveBeenLastCalledWith(MUSIC.sinkingThings);
});

it("casts on the sim starting, attacks when hooked, and stops the attack when the run ends", () => {
	render(<AudioSync payoutOpen={false} />);

	setSim({});
	expect(sound.playSfx).toHaveBeenCalledWith(SFX.cast);

	setSim({ phase: "hooked" });
	expect(sound.playSfx).toHaveBeenCalledWith(SFX.attack);

	act(() => useHookStore.setState({ sim: undefined }));
	expect(sound.stopSfx).toHaveBeenLastCalledWith(SFX.attack);
});

it("plays the win sound when the payout opens", () => {
	const { rerender } = render(<AudioSync payoutOpen={false} />);
	rerender(<AudioSync payoutOpen />);
	expect(sound.playSfx).toHaveBeenCalledWith(SFX.win);
});
