import type { ReactNode } from "react";
import { useState } from "react";
import { Application, extend } from "@pixi/react";
import { Container, Graphics, Mesh, Sprite, Text, TilingSprite } from "pixi.js";

import Balance from "@components/Balance";
import BottomBar from "@components/BottomBar";
import DebugPanel from "@components/DebugPanel";
import DepthIndicator from "@components/DepthIndicator";
import HarbourScene from "@components/HarbourScene";
import LoadingScreen from "@components/LoadingScreen";
import PlaceholderScene from "@components/PlaceholderScene/PlaceholderScene";
import SceneManager from "@components/SceneManager/SceneManager";
import StoreSync from "@components/system/StoreSync";
import { MAX_DEPTH_METERS } from "@constants/depthZones";
import { Button, Checkbox } from "@hooked-ui";
import { useDescentDepth } from "@hooks/useDescentDepth";
import { useGameBootstrap } from "@hooks/useGameBootstrap";
import { type GamePhase, useGameStore } from "@stores/gameStore";
import { useKrakenStore } from "@stores/krakenStore";

import styles from "./App.module.css";

// Registers the Pixi classes used as JSX tags (pixiContainer, pixiGraphics,
// pixiText) below and in every scene component — @pixi/react doesn't bundle
// these by default.
extend({ Container, Graphics, Mesh, Sprite, Text, TilingSprite });

/**
 * Mounts the one <Application> for the whole game (ARCHITECTURE §38) and
 * runs the loading → tutorial → game phase machine (§0.2, §18). HTML
 * overlays are siblings of the canvas, never its children.
 */
function App() {
	const phase = useGameStore(state => state.phase);
	const setPhase = useGameStore(state => state.setPhase);
	const skipTutorial = useGameStore(state => state.skipTutorial);
	const setSkipTutorial = useGameStore(state => state.setSkipTutorial);
	const onAppInit = useGameBootstrap();

	const [descending, setDescending] = useState(false);
	const descentDepth = useDescentDepth(descending, () => setDescending(false));

	// DEBUG panel's Kraken toggle: the hook is parked at the bottom of the trench
	// at once, whatever the cast is doing, until it's unticked or Surface is hit.
	const forceTrench = useKrakenStore(state => state.forceTrench);
	const setForceTrench = useKrakenStore(state => state.setForceTrench);
	const depth = forceTrench ? MAX_DEPTH_METERS : descentDepth;
	const underwater = descending || forceTrench;

	// The harbour needs the live `depth` value (the cast is a camera move
	// through one continuous world, not a scene swap), so unlike a static map
	// this is rebuilt every render — cheap, and SceneManager reconciles by
	// key/type, not by object identity, so that's harmless.
	const scenes: Record<GamePhase, ReactNode> = {
		loading: <PlaceholderScene label="Loading…" color={0x0a1a2f} />,
		tutorial: <PlaceholderScene label="Tutorial" color={0x0f5c5c} />,
		game: <HarbourScene depth={depth} />
	};

	return (
		<div className={styles.root}>
			<Application
				className={styles.canvas}
				background={0x000000}
				resizeTo={window}
				resolution={window.devicePixelRatio}
				autoDensity
				onInit={onAppInit}
			>
				<SceneManager activeKey={phase} scenes={scenes} />
			</Application>

			<StoreSync />

			{phase === "loading" && <LoadingScreen />}

			{phase === "game" && <Balance />}
			{phase === "game" && underwater && <DepthIndicator depth={depth} />}
			{phase === "game" && (
				<BottomBar
					descending={underwater}
					onCast={() => {
						setForceTrench(false);
						setDescending(!underwater);
					}}
				/>
			)}

			{phase === "tutorial" && (
				<div className={styles.overlay}>
					<div className={styles.skipTutorial}>
						<Checkbox value={skipTutorial} onValueChange={setSkipTutorial} aria-label="Skip tutorial next time" />
						Skip tutorial next time
					</div>
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
