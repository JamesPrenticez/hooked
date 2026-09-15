import { lineDrift } from "./lineDrift";

interface FishingLineProps {
	view: { width: number; height: number };
	depth: number;
	seconds: number;
}

/** Depth at which the line has fully paid out to its resting length — past
 *  this the hook holds and the parallax layers behind it keep scrolling to
 *  sell the continued descent (BUILD_PLAN §13.2 "camera follows hook", without
 *  an actual camera). */
const PAYOUT_METERS = 150;

/** How far `lineDrift`'s `-1..1` swings the line, as a fraction of the
 *  screen width either side of centre. */
const DRIFT_FRACTION = 0.35;

/**
 * The line + hook — the only part of the rig still visible once it's in the
 * water (the boat/player/rod stay in HarbourScene, at the surface). Drawn
 * straight and taut, not swaying: the whole line drifts left/right together
 * from an anchor point above the top edge, per `lineDrift`. No art yet
 * (`src/assets/player/` is empty) — a plain stroke + dot placeholder.
 */
function FishingLine({ view, depth, seconds }: FishingLineProps) {
	const payout = Math.min(depth / PAYOUT_METERS, 1);
	const restY = view.height * 0.5;
	const x = view.width / 2 + lineDrift(seconds) * view.width * DRIFT_FRACTION;
	const hookY = restY * payout;

	return (
		<pixiGraphics
			draw={g => {
				g.clear();
				g.moveTo(x, 0).lineTo(x, hookY).stroke({ width: 1.5, color: 0xe8e8e8, alpha: 0.8 });
				g.circle(x, hookY, 4).fill(0xc9c9c9);
			}}
		/>
	);
}

export default FishingLine;
