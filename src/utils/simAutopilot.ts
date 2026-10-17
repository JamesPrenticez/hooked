import { HOOK_DRAG, HOOK_MAX_VX, HOOK_TIP_DY, PX_PER_METER, TICK_HZ } from "./simConfig.ts";
import { type Sim, zoneSpeed } from "./simStep.ts";
import { mouthAt } from "./simWorld.ts";

/** Px the hook still travels after steering stops: Σ vx·DRAGⁿ / TICK_HZ. */
const COAST = 1 / TICK_HZ / (1 - HOOK_DRAG);
const DEADBAND_PX = 4;

/**
 * Steering axis (−1 / 0 / +1) that puts the hook tip on a fish mouth: aims at the nearest fish below it that the hook
 * can still reach by the time it gets there, at where that mouth will be then. Same input a player gives.
 */
export function autopilotAxis(sim: Sim): number {
	const tipY = sim.depthM * PX_PER_METER + HOOK_TIP_DY;
	const pxPerTick = (zoneSpeed(sim.depthM) * PX_PER_METER) / TICK_HZ;
	let best: { x: number; reachable: boolean; dy: number } | undefined;
	for (const fish of sim.world) {
		const dy = mouthAt(fish, sim.tick).y - tipY;
		if (dy < 0 || (best && best.reachable && dy > best.dy)) continue;
		const lead = dy / pxPerTick;
		const x = mouthAt(fish, sim.tick + lead).x;
		const reachable = Math.abs(x - sim.x) <= (HOOK_MAX_VX / TICK_HZ) * lead * 0.6;
		if (!best || (reachable && !best.reachable) || (reachable === best.reachable && dy < best.dy))
			best = { x, reachable, dy };
	}
	if (!best) return 0;
	const error = best.x - (sim.x + sim.vx * COAST);
	return Math.abs(error) <= DEADBAND_PX ? 0 : Math.sign(error);
}
