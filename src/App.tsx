import type { ReactNode } from "react";
import { useState } from "react";
import { Application, extend } from "@pixi/react";
import { Container, Graphics, Mesh, Sprite, Text, TilingSprite } from "pixi.js";
import styled from "styled-components";

import { BottomBar } from "@components/BottomBar";
import { DebugPanel } from "@components/DebugPanel";
import { DepthIndicator } from "@components/DepthIndicator";
import { ExtractionMultiplier } from "@components/ExtractionMultiplier";
import { HarbourDebug } from "@components/HarbourDebug";
import { HarbourScene } from "@components/HarbourScene";
import { HookedBanner } from "@components/HookedBanner";
import { LoadingScreen } from "@components/LoadingScreen";
import { SceneManager } from "@components/SceneManager/SceneManager";
import { StoreSync } from "@components/system/StoreSync";
import { DEBUG } from "@constants/config";
import { KRAKEN_DEPTH_METERS } from "@constants/depthZones";
import { Button, Checkbox } from "@hooked-ui";
import { useDescentDepth } from "@hooks/useDescentDepth";
import { useGameBootstrap } from "@hooks/useGameBootstrap";
import { useHookSim } from "@hooks/useHookSim";
import { type GamePhase, useGameStore } from "@stores/gameStore";
import { useHookStore, useSimHook } from "@stores/hookStore";
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

/* Anchored to the bottom, not centered: the backdrop's own centered label
 * must stay visible underneath this overlay, never covered by it. */
const Overlay = styled.div`
	position: absolute;
	inset: 0;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: flex-end;
	gap: var(--spacing-md);
	padding-bottom: var(--spacing-xxxl);
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

	const [descending, setDescending] = useState(false);
	const manual = useSimHook();
	// Manual (debug) runs the arrow-key sim instead of the scripted descent.
	const descentDepth = useDescentDepth(descending && !manual, () => setDescending(false));
	useHookSim(descending && manual, () => setDescending(false));
	// The camera's depth, not the hook's: after a fish bites the camera returns to the surface alone.
	const simDepth = useHookStore(state => state.sim?.cameraM ?? 0);

	// DEBUG panel's Kraken toggle: the hook is parked at the bottom of the trench
	// at once, whatever the cast is doing, until it's unticked or Surface is hit.
	const forceTrench = useKrakenStore(state => state.forceTrench);
	const setForceTrench = useKrakenStore(state => state.setForceTrench);
	const depth = forceTrench ? KRAKEN_DEPTH_METERS : manual ? simDepth : descentDepth;
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
			{phase === "game" && <ExtractionMultiplier />}
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
				<DebugDock>
					<HarbourDebug />
					<DebugPanel />
				</DebugDock>
			)}
		</Root>
	);
}
