import { useApplication } from "@pixi/react";
import type { ColorSource } from "pixi.js";

interface PlaceholderSceneProps {
	label: string;
	color: ColorSource;
}

/**
 * Stand-in for a phase's real scene (LoadingScreen §5, TutorialScreen §6,
 * HarbourScreen §7) — proves the phase machine and scene manager without
 * building that art/content early (BUILD_PLAN: use placeholders until the
 * underlying system is proven).
 */
function PlaceholderScene({ label, color }: PlaceholderSceneProps) {
	const { app, isInitialised } = useApplication();
	// Children render before the underlying Pixi Application finishes its
	// async init() — app is undefined until isInitialised flips.
	if (!isInitialised) return null;
	const { width, height } = app.screen;

	return (
		<pixiContainer>
			<pixiGraphics draw={g => g.clear().rect(0, 0, width, height).fill(color)} />
			<pixiText
				text={label}
				anchor={0.5}
				x={width / 2}
				y={height / 2}
				style={{ fill: "#ffffff", fontSize: 32, fontWeight: "bold" }}
			/>
		</pixiContainer>
	);
}

export default PlaceholderScene;
