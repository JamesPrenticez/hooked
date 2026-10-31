import { useEffect } from "react";

import { zoneForDepth } from "@constants/depthZones";
import { useAudioStore } from "@stores/audioStore";
import { useHookStore } from "@stores/hookStore";
import { useRoundStore } from "@stores/roundStore";
import { MUSIC, playMusic, playSfx, setMasterVolume, setMuted, SFX, stopSfx } from "@utils/sound";

/** The hook has left the rod this long after the cast sound, so the splash doesn't land on top of it. */
const SPLASH_DELAY_MS = 600;

const HOOKED_PHASES = new Set(["hooked", "announce", "ascend", "extract"]);

const DEEP_ZONES = new Set(["deep", "abyss", "trench", "jackpot"]);

/**
 * Headless: turns the cast, the fishing sim and the payout modal into sound. Like `StoreSync`, it is the one place
 * that listens — no store or scene knows about audio. Mount once as a sibling of <Application>.
 */
export function AudioSync({ payoutOpen }: { payoutOpen: boolean }) {
	const muted = useAudioStore(s => s.muted);
	const masterVolume = useAudioStore(s => s.masterVolume);
	const casting = useHookStore(s => s.sim !== undefined);
	const hooked = useHookStore(s => s.sim?.phase === "hooked");
	// From the bite until the hook breaks the surface the attack sting owns the mix, so the music stays off.
	const fighting = useHookStore(s => HOOKED_PHASES.has(s.sim?.phase ?? ""));
	// The camera's depth, so the music turns back to the surface theme as the catch is hauled up.
	const deep = useHookStore(s => DEEP_ZONES.has(zoneForDepth(s.sim?.cameraM ?? 0).id));

	useEffect(() => setMuted(muted), [muted]);
	useEffect(() => setMasterVolume(masterVolume), [masterVolume]);

	useEffect(
		() => playMusic(fighting || payoutOpen ? undefined : deep ? MUSIC.sinkingThings : MUSIC.beachway),
		[deep, fighting, payoutOpen]
	);

	useEffect(() => {
		if (!casting) return;
		playSfx(SFX.cast);
		const timer = setTimeout(() => playSfx(SFX.splash), SPLASH_DELAY_MS);
		return () => clearTimeout(timer);
	}, [casting]);

	// Plays through the reveal and the winding in; cut when the run ends.
	useEffect(() => {
		if (hooked) playSfx(SFX.attack);
	}, [hooked]);
	useEffect(() => {
		if (!casting) stopSfx(SFX.attack);
	}, [casting]);

	useEffect(() => {
		if (payoutOpen) playSfx(useRoundStore.getState().round?.outcome.escaped ? SFX.fail : SFX.win);
	}, [payoutOpen]);

	return null;
}
