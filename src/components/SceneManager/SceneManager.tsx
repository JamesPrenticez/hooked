import type { ReactNode } from "react";

import { useCrossfade } from "@/hooks/useCrossfade";

export interface SceneManagerProps<K extends string> {
	/** Key of the scene to show. Changing it crossfades from the previous one. */
	activeKey: K;
	scenes: Record<K, ReactNode>;
}

/**
 * Renders the scene registered for `activeKey`, crossfading out the
 * previous one (see useCrossfade). One instance drives every phase/scene
 * swap in the game (BUILD_PLAN §0.2) — never one-off per transition.
 */
function SceneManager<K extends string>({ activeKey, scenes }: SceneManagerProps<K>) {
	const outgoing = useCrossfade(activeKey);

	return (
		<pixiContainer>
			<pixiContainer>{scenes[activeKey]}</pixiContainer>
			{outgoing && <pixiContainer alpha={outgoing.alpha}>{scenes[outgoing.key]}</pixiContainer>}
		</pixiContainer>
	);
}

export default SceneManager;
