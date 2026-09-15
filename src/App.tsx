import type { ReactNode } from "react";
import { useState } from "react";
import { Application, extend } from "@pixi/react";
import { Container, Graphics, Sprite, Text, TilingSprite } from "pixi.js";

import Balance from "@components/Balance";
import BottomBar from "@components/BottomBar";
import DebugPanel from "@components/DebugPanel";
import DepthIndicator from "@components/DepthIndicator";
import DescentScene from "@components/DescentScene";
import HarbourScene from "@components/HarbourScene";
import LoadingScreen from "@components/LoadingScreen";
import PlaceholderScene from "@components/PlaceholderScene/PlaceholderScene";
import SceneManager from "@components/SceneManager/SceneManager";
import StoreSync from "@components/system/StoreSync";
import { Button } from "@hooked-ui";
import { useDescentDepth } from "@hooks/useDescentDepth";
import { useGameBootstrap } from "@hooks/useGameBootstrap";
import { type GamePhase, useGameStore } from "@stores/gameStore";

import styles from "./App.module.css";

// Registers the Pixi classes used as JSX tags (pixiContainer, pixiGraphics,
// pixiText) below and in every scene component — @pixi/react doesn't bundle
// these by default.
extend({ Container, Graphics, Sprite, Text, TilingSprite });

// `game` covers both the harbour hub and the (client-only, no bets yet)
// descent view the bottom bar's cast-line button toggles into.
type SceneKey = GamePhase | "descent";

/**
 * Mounts the one <Application> for the whole game (ARCHITECTURE §38) and
 * runs the loading → tutorial → game phase machine (§0.2, §18). HTML
 * overlays are siblings of the canvas, never its children.
 */
function App() {
	const phase = useGameStore(state => state.phase);
	const setPhase = useGameStore(state => state.setPhase);
	const onAppInit = useGameBootstrap();

	const [descending, setDescending] = useState(false);
	const depth = useDescentDepth(descending);
	const sceneKey: SceneKey = phase === "game" && descending ? "descent" : phase;

	// `descent` needs the live `depth` value, so unlike a static map this is
	// rebuilt every render — cheap, and SceneManager reconciles by key/type,
	// not by object identity, so that's harmless.
	const scenes: Record<SceneKey, ReactNode> = {
		loading: <PlaceholderScene label="Loading…" color={0x0a1a2f} />,
		tutorial: <PlaceholderScene label="Tutorial" color={0x0f5c5c} />,
		game: <HarbourScene />,
		descent: <DescentScene depth={depth} />
	};

	return (
		<div className={styles.root}>
			<Application className={styles.canvas} background={0x000000} resizeTo={window} onInit={onAppInit}>
				<SceneManager activeKey={sceneKey} scenes={scenes} />
			</Application>

			<StoreSync />

			{phase === "loading" && <LoadingScreen />}

			{phase === "game" && <Balance />}
			{phase === "game" && descending && <DepthIndicator depth={depth} />}
			{phase === "game" && <BottomBar descending={descending} onCast={() => setDescending(d => !d)} />}

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
