import type { ReactNode } from "react";
import { Application, extend } from "@pixi/react";
import { Container, Graphics, Sprite, Text, TilingSprite } from "pixi.js";

import Balance from "@components/Balance";
import DebugPanel from "@components/DebugPanel";
import HarbourScene from "@components/HarbourScene";
import LoadingScreen from "@components/LoadingScreen";
import PlaceholderScene from "@components/PlaceholderScene/PlaceholderScene";
import SceneManager from "@components/SceneManager/SceneManager";
import StoreSync from "@components/system/StoreSync";
import { Button } from "@hooked-ui";
import { useGameBootstrap } from "@hooks/useGameBootstrap";
import { type GamePhase, useGameStore } from "@stores/gameStore";

import styles from "./App.module.css";

// Registers the Pixi classes used as JSX tags (pixiContainer, pixiGraphics,
// pixiText) below and in every scene component — @pixi/react doesn't bundle
// these by default.
extend({ Container, Graphics, Sprite, Text, TilingSprite });

// `game` is the real (placeholder-art) harbour scene now — §7.1. `loading`
// and `tutorial` stay colored rects until §5.1's overlay / §6's slide deck
// need more; swapping any of them never touches SceneManager or the phase
// machine.
const SCENES: Record<GamePhase, ReactNode> = {
	loading: <PlaceholderScene label="Loading…" color={0x0a1a2f} />,
	tutorial: <PlaceholderScene label="Tutorial" color={0x0f5c5c} />,
	game: <HarbourScene />
};

/**
 * Mounts the one <Application> for the whole game (ARCHITECTURE §38) and
 * runs the loading → tutorial → game phase machine (§0.2, §18). HTML
 * overlays are siblings of the canvas, never its children.
 */
function App() {
	const phase = useGameStore(state => state.phase);
	const setPhase = useGameStore(state => state.setPhase);
	const onAppInit = useGameBootstrap();

	return (
		<div className={styles.root}>
			<Application className={styles.canvas} background={0x000000} resizeTo={window} onInit={onAppInit}>
				<SceneManager activeKey={phase} scenes={SCENES} />
			</Application>

			<StoreSync />

			{phase === "loading" && <LoadingScreen />}

			{phase === "game" && <Balance />}

			{phase === "tutorial" && (
				<div className={styles.overlay}>
					<Button variant="primary" onClick={() => setPhase("game")}>
						Start Fishing
					</Button>
				</div>
			)}

			<DebugPanel />
		</div>
	);
}

export default App;
