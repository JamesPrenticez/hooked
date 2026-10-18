import { useEffect } from "react";

import { setOnSessionExpired } from "@api";
import { playerCue } from "@components/harbour-scene/extraction";
import { useGameStore } from "@stores/gameStore";
import { useHookStore } from "@stores/hookStore";
import { usePlayerStore } from "@stores/playerStore";

/**
 * The only file that wires API-layer events into stores (ARCHITECTURE §7,
 * §39) — no store imports `@api` directly. It also cues the fisherman from
 * the fishing sim (reeling, battling, celebrating as the catch is landed),
 * since neither store may subscribe to the other. Headless: renders nothing,
 * mount once as a sibling of <Application>. The one-shot boot/reconnect
 * reconcile lives next door in `roundRecovery.ts`.
 */
export function StoreSync() {
	const setPhase = useGameStore(state => state.setPhase);
	const cue = useHookStore(state => playerCue(state.sim));
	const play = usePlayerStore(state => state.play);

	useEffect(() => {
		setOnSessionExpired(() => setPhase("loading"));
	}, [setPhase]);

	useEffect(() => {
		if (cue) play(cue);
	}, [cue, play]);

	return null;
}
