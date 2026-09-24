import {
	DECEL_FRACTION,
	HOOK_ACCEL,
	HOOK_DRAG,
	HOOK_MAX_VX,
	MAX_DEPTH_METERS,
	MIN_DESCENT_METERS_PER_SECOND,
	SIM_WIDTH,
	TICK_HZ,
	ZONES
} from "./simConfig.ts";

export type SimPhase = "descend" | "bottom";

export interface Sim {
	worldSeed: number;
	tick: number;
	/** Hook x in sim px, `0..SIM_WIDTH`. */
	x: number;
	/** Hook velocity, px/s. */
	vx: number;
	depthM: number;
	phase: SimPhase;
}

export function createSim(worldSeed: number): Sim {
	return { worldSeed, tick: 0, x: SIM_WIDTH / 2, vx: 0, depthM: 0, phase: "descend" };
}

function zoneSpeed(depthM: number): number {
	let speed: number = ZONES[0].speed;
	for (const zone of ZONES) {
		if (depthM < zone.fromMeters) break;
		speed = zone.speed;
	}
	return speed;
}

/** Advances `sim` one tick in place. `axis` is the steering input, −1 / 0 / +1. */
export function step(sim: Sim, axis: number): void {
	sim.tick += 1;

	sim.vx = Math.max(-HOOK_MAX_VX, Math.min(HOOK_MAX_VX, (sim.vx + axis * HOOK_ACCEL) * HOOK_DRAG));
	sim.x += sim.vx / TICK_HZ;
	if (sim.x <= 0 || sim.x >= SIM_WIDTH) {
		sim.x = sim.x <= 0 ? 0 : SIM_WIDTH;
		sim.vx = 0;
	}

	if (sim.phase !== "descend") return;
	const speed = zoneSpeed(sim.depthM);
	const decelStart = MAX_DEPTH_METERS * (1 - DECEL_FRACTION);
	const factor =
		sim.depthM > decelStart ? Math.max(0, (MAX_DEPTH_METERS - sim.depthM) / (MAX_DEPTH_METERS - decelStart)) : 1;
	const effective = Math.max(speed * factor, Math.min(speed, MIN_DESCENT_METERS_PER_SECOND));
	sim.depthM = Math.min(MAX_DEPTH_METERS, sim.depthM + effective / TICK_HZ);
	if (sim.depthM >= MAX_DEPTH_METERS) sim.phase = "bottom";
}
