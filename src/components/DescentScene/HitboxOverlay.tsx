import { depthToScreenY } from "@components/HarbourScene/framing";
import { useHookStore } from "@stores/hookStore";
import { HOOK_R, HOOK_TIP_DY, SIM_WIDTH } from "@utils/simConfig";
import { mouthAt } from "@utils/simWorld";

interface HitboxOverlayProps {
	view: { width: number; height: number };
	depth: number;
}

/** Debug: every mouth circle in the sim world and the hook tip, at the sim's tick. */
function HitboxOverlay({ view, depth }: HitboxOverlayProps) {
	const sim = useHookStore(state => state.sim);
	const show = useHookStore(state => state.showHitboxes);
	if (!sim || !show) return null;

	return (
		<pixiGraphics
			draw={g => {
				g.clear();
				sim.world.forEach((fish, i) => {
					const mouth = mouthAt(fish, sim.tick);
					const y = depthToScreenY(fish.meters, depth, view) + fish.mouth.dy;
					if (Math.abs(y - view.height / 2) > view.height / 2) return;
					const x = (mouth.x / SIM_WIDTH) * view.width;
					g.circle(x, y, mouth.r).stroke({ width: 2, color: i === sim.hooked ? 0xff3b30 : 0xffd60a });
				});
				g.circle((sim.x / SIM_WIDTH) * view.width, view.height / 2 + HOOK_TIP_DY, HOOK_R).stroke({
					width: 2,
					color: 0x30d158
				});
			}}
		/>
	);
}

export default HitboxOverlay;
