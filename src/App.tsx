import type { ReactNode } from "react";
import { useState } from "react";
import { Application, extend } from "@pixi/react";
import { Container, Graphics, Mesh, Sprite, Text, TilingSprite } from "pixi.js";
import styled from "styled-components";

import { BottomBar } from "@components/bottom-bar";
import { DebugModal } from "@components/debug";
import { DepthIndicator } from "@components/depth-indicator";
import { HarbourDebug } from "@components/harbour-debug";
import { HarbourScene } from "@components/harbour-scene";
import { HookedBanner } from "@components/hooked-banner";
import { LoadingScreen } from "@components/loading-screen";
import { SceneManager } from "@components/scene-manager/SceneManager";
import { closeRound, openRound } from "@components/system/roundController";
import { StoreSync } from "@components/system/StoreSync";
import { DEBUG } from "@constants/config";
import { KRAKEN_DEPTH_METERS } from "@constants/depthZones";
import { Button, Checkbox, Overlay } from "@hooked-ui";
import { useGameBootstrap } from "@hooks/useGameBootstrap";
import { useHookSim } from "@hooks/useHookSim";
import { useDebugStore } from "@stores/debugStore";
import { type GamePhase, useGameStore } from "@stores/gameStore";
import { useHookStore } from "@stores/hookStore";
import { useKrakenStore } from "@stores/krakenStore";

const Root = styled.div`
	position: relative;
	width: 100vw;
	height: 100vh;
	overflow: hidden;
`;

const Canvas = styled(Application)`
	position: absolute;
	inset: 0;
`;

/* Stand-in for the tutorial's real content (milestone 6) — proves the phase
 * machine without building that art early. Plain HTML, not a Pixi scene:
 * nothing about it needs the canvas. */
const TutorialBackdrop = styled.div`
	position: absolute;
	inset: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--color-secondary);
	color: var(--color-white);
	font: var(--font-display-lg);
`;

const DebugDock = styled.div`
	position: absolute;
	right: var(--spacing-md);
	bottom: var(--spacing-md);
	z-index: 10;
	display: flex;
	gap: var(--spacing-sm);
`;

const SkipTutorial = styled.div`
	display: flex;
	align-items: center;
	gap: var(--spacing-sm);
	color: var(--color-white);
	font: var(--font-display-xs);
`;

// Registers the Pixi classes used as JSX tags (pixiContainer, pixiGraphics,
// pixiText) below and in every scene component — @pixi/react doesn't bundle
// these by default.
extend({ Container, Graphics, Mesh, Sprite, Text, TilingSprite });

/**
 * Mounts the one <Application> for the whole game (ARCHITECTURE §38) and
 * runs the loading → tutorial → game phase machine (§0.2, §18). HTML
 * overlays are siblings of the canvas, never its children.
 */
export function App() {
	const phase = useGameStore(state => state.phase);
	const setPhase = useGameStore(state => state.setPhase);
	const skipTutorial = useGameStore(state => state.skipTutorial);
	const setSkipTutorial = useGameStore(state => state.setSkipTutorial);
	const { onInit, progress } = useGameBootstrap();

	const isDebugOpen = useDebugStore(state => state.isDebugOpen);
	const setIsDebugOpen = useDebugStore(state => state.setIsDebugOpen);

	const [descending, setDescending] = useState(false);
	// Every cast runs the sim: arrow keys in manual (debug), an autopilot to the server's fish otherwise.
	const land = () => {
		setDescending(false);
		closeRound().catch(console.error);
	};
	useHookSim(descending, land);
	// The camera's depth, not the hook's: after a fish bites the camera returns to the surface alone.
	const simDepth = useHookStore(state => state.sim?.cameraM ?? 0);

	// DEBUG panel's Kraken toggle: the hook is parked at the bottom of the trench
	// at once, whatever the cast is doing, until it's unticked or Surface is hit.
	const forceTrench = useKrakenStore(state => state.forceTrench);
	const setForceTrench = useKrakenStore(state => state.setForceTrench);
	const depth = forceTrench ? KRAKEN_DEPTH_METERS : simDepth;
	const underwater = descending || forceTrench;

	// The harbour needs the live `depth` value (the cast is a camera move
	// through one continuous world, not a scene swap), so unlike a static map
	// this is rebuilt every render — cheap, and SceneManager reconciles by
	// key/type, not by object identity, so that's harmless.
	const scenes: Record<GamePhase, ReactNode> = {
		loading: null,
		tutorial: null,
		game: <HarbourScene depth={depth} />
	};

	return (
		<Root>
			<Canvas background={0x000000} resizeTo={window} resolution={window.devicePixelRatio} autoDensity onInit={onInit}>
				<SceneManager activeKey={phase} scenes={scenes} />
			</Canvas>

			<StoreSync />

			{phase === "loading" && <LoadingScreen progress={progress} />}

			{phase === "game" && underwater && <DepthIndicator depth={depth} />}
			{phase === "game" && <HookedBanner />}
			{phase === "game" && (
				<BottomBar
					descending={underwater}
					onCast={async () => {
						setForceTrench(false);
						if (underwater) return land();
						try {
							await openRound();
							setDescending(true);
						} catch (err) {
							console.error(err);
						}
					}}
				/>
			)}

			{phase === "tutorial" && (
				<>
					<TutorialBackdrop>Tutorial</TutorialBackdrop>
					<Overlay>
						<SkipTutorial>
							<Checkbox value={skipTutorial} onValueChange={setSkipTutorial} aria-label="Skip tutorial next time" />
							Skip tutorial next time
						</SkipTutorial>
						<Button variant="primary" onClick={() => setPhase("game")}>
							Start Fishing
						</Button>
					</Overlay>
				</>
			)}

			{DEBUG && (
				<>
					<DebugDock>
						<Button title="debug" onClick={() => setIsDebugOpen(true)}>
							DEBUG
						</Button>
						<HarbourDebug />
					</DebugDock>
					{isDebugOpen && <DebugModal />}
				</>
			)}
		</Root>
	);
}
