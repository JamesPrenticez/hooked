import { type DepthUnit, type DepthZone, formatDepth } from "@constants/depthZones";

interface DepthMarkersProps {
	view: { width: number; height: number };
	depth: number;
	zones: DepthZone[];
	unit: DepthUnit;
}

/** Screen pixels per metre of depth the markers scroll by. Independent of
 *  `FishingLine`'s short payout animation — this is a literal world scale,
 *  chosen so 6,000m of trench crosses the screen at a readable pace rather
 *  than flashing past or taking forever. */
const PX_PER_METER = 0.6;

/**
 * One horizontal line + label per depth-zone boundary (`DEPTH_ZONES`),
 * scrolling past as `depth` increases — the zone the hook is currently
 * level with sits at screen centre, matching `FishingLine`'s resting hook
 * height.
 */
function DepthMarkers({ view, depth, zones, unit }: DepthMarkersProps) {
	const centerY = view.height * 0.5;

	return (
		<pixiContainer>
			{zones.map(zone => {
				const y = centerY + (zone.fromMeters - depth) * PX_PER_METER;
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
							style={{ fill: 0xffffff, fontSize: 13, fontWeight: "bold", letterSpacing: 1 }}
						/>
					</pixiContainer>
				);
			})}
		</pixiContainer>
	);
}

export default DepthMarkers;
