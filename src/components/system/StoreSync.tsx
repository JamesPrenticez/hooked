import { useEffect } from "react";

import { setOnSessionExpired } from "@api";
import { useGameStore } from "@stores/gameStore";

/**
 * The only file that wires API-layer events into stores (ARCHITECTURE §7,
 * §39) — no store imports `@api` directly. Headless: renders nothing, mount
 * once as a sibling of <Application>. The one-shot boot/reconnect reconcile
 * lives next door in `roundRecovery.ts`.
 */
function StoreSync() {
	const setPhase = useGameStore(state => state.setPhase);

	useEffect(() => {
		setOnSessionExpired(() => setPhase("loading"));
	}, [setPhase]);

	return null;
}

export default StoreSync;
