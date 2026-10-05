import { castProgress, depthToScreenY } from "@components/HarbourScene/framing";
import { type DepthUnit, type DepthZone, formatDepth } from "@constants/depthZones";

// Hoisted: DescentScene re-renders every frame off the wall clock, and a fresh object here
// would make pixiText rebuild its TextStyle (measureText/measureFont) every frame forever.
const LABEL_STYLE = {
	fill: 0xffffff,
	fontSize: 13,
	fontWeight: "bold",
	letterSpacing: 1
} as const;

interface DepthMarkersProps {
	view: { width: number; height: number };
	depth: number;
	zones: DepthZone[];
	unit: DepthUnit;
}

/**
 * One horizontal line + label per depth-zone boundary (`DEPTH_ZONES`),
 * scrolling past as `depth` increases — the zone the hook is currently
 * level with sits at screen centre, matching the hook's resting height. They
 * fade in as the cast finishes, so the harbour's idle waterline stays clean.
 */
export function DepthMarkers({ view, depth, zones, unit }: DepthMarkersProps) {
	return (
		<pixiContainer alpha={castProgress(depth)}>
			{zones.map(zone => {
				const y = depthToScreenY(zone.fromMeters, depth, view);
				return (
					<pixiContainer key={zone.id}>
						<pixiGraphics
							draw={g => {
								g.clear();
								g.moveTo(0, y).lineTo(view.width, y).stroke({ width: 1, color: 0xffffff, alpha: 0.25 });
							}}
						/>
						<pixiText
							text={`${zone.label.toUpperCase()} · ${formatDepth(zone.fromMeters, unit)}`}
							x={12}
							y={y - 16}
							style={LABEL_STYLE}
						/>
					</pixiContainer>
				);
			})}
		</pixiContainer>
	);
}
