import {
	CAST_METERS,
	DECEL_FRACTION,
	HOOK_ACCEL,
	HOOK_DRAG,
	HOOK_MAX_VX,
	HOOK_R,
	HOOK_TIP_DY,
	HOOKED_TICKS,
	KRAKEN_FIGHT_TICKS,
	MAX_DEPTH_METERS,
	MIN_DESCENT_METERS_PER_SECOND,
	PX_PER_METER,
	REEL_METERS_PER_SECOND,
	SIM_WIDTH,
	TICK_HZ,
	ZONES
} from "./simConfig.ts";
import { mouthAt, spawnWorld, type WorldFish } from "./simWorld.ts";

export type SimPhase = "descend" | "hooked" | "kraken" | "reel" | "surfaced";

/** What a finished run caught: a roster id, or `"kraken"` from the bottom. */
export interface SimResult {
	fish: string;
	depthM: number;
	ticks: number;
}

export interface Sim {
	worldSeed: number;
	tick: number;
	/** Hook x in sim px, `0..SIM_WIDTH`. */
	x: number;
	/** Hook velocity, px/s. */
	vx: number;
	depthM: number;
	phase: SimPhase;
	/** Every fish, fixed by `worldSeed`. */
	world: WorldFish[];
	/** Index into `world` of the fish on the hook, or -1. */
	hooked: number;
	/** The tick the hook caught it, or -1. */
	hookedTick: number;
	/** The tick the Kraken fight began, or -1. */
	fightTick: number;
	/** Set once SURFACED. */
	result?: SimResult;
}

export function createSim(worldSeed: number): Sim {
	return {
		worldSeed,
		tick: 0,
		x: SIM_WIDTH / 2,
		vx: 0,
		depthM: 0,
		phase: "descend",
		world: spawnWorld(worldSeed),
		hooked: -1,
		hookedTick: -1,
		fightTick: -1
	};
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
	if (sim.phase === "surfaced") return;
	if (sim.phase === "hooked") {
		if (sim.tick - sim.hookedTick >= HOOKED_TICKS) sim.phase = "reel";
		return;
	}
	if (sim.phase === "kraken") {
		if (sim.tick - sim.fightTick >= KRAKEN_FIGHT_TICKS) sim.phase = "reel";
		return;
	}
	if (sim.phase === "reel") {
		sim.depthM = Math.max(0, sim.depthM - REEL_METERS_PER_SECOND / TICK_HZ);
		if (sim.depthM <= 0) {
			sim.phase = "surfaced";
			sim.result = { fish: sim.world[sim.hooked]?.id ?? "kraken", depthM: sim.depthM, ticks: sim.tick };
		}
		return;
	}

	sim.vx = Math.max(-HOOK_MAX_VX, Math.min(HOOK_MAX_VX, (sim.vx + axis * HOOK_ACCEL) * HOOK_DRAG));
	sim.x += sim.vx / TICK_HZ;
	if (sim.x <= 0 || sim.x >= SIM_WIDTH) {
		sim.x = sim.x <= 0 ? 0 : SIM_WIDTH;
		sim.vx = 0;
	}

	const speed = zoneSpeed(sim.depthM);
	const decelStart = MAX_DEPTH_METERS * (1 - DECEL_FRACTION);
	const factor =
		sim.depthM > decelStart ? Math.max(0, (MAX_DEPTH_METERS - sim.depthM) / (MAX_DEPTH_METERS - decelStart)) : 1;
	const effective = Math.max(speed * factor, Math.min(speed, MIN_DESCENT_METERS_PER_SECOND));
	sim.depthM = Math.min(MAX_DEPTH_METERS, sim.depthM + effective / TICK_HZ);
	if (sim.depthM >= MAX_DEPTH_METERS) {
		sim.phase = "kraken";
		sim.fightTick = sim.tick;
	} else if (sim.depthM >= CAST_METERS) hookFish(sim);
}

/** The first mouth (lowest index) the hook tip touches, if any, goes on the hook. */
function hookFish(sim: Sim): void {
	const tipY = sim.depthM * PX_PER_METER + HOOK_TIP_DY;
	for (let i = 0; i < sim.world.length; i++) {
		const mouth = mouthAt(sim.world[i], sim.tick);
		const dx = sim.x - mouth.x;
		const dy = tipY - mouth.y;
		const reach = HOOK_R + mouth.r;
		if (dx * dx + dy * dy <= reach * reach) {
			sim.hooked = i;
			sim.hookedTick = sim.tick;
			sim.phase = "hooked";
			return;
		}
	}
}
