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
import {
	ANNOUNCE_TICKS,
	ascentDepth,
	ascentTicks,
	extractionAt,
	extractionTicks,
	gearsFor,
	MIN_MULTIPLIER
} from "./simExtraction.ts";
import { mouthAt, spawnWorld, type WorldFish } from "./simWorld.ts";

/** A fish: `descend` → `hooked` (it fights the hook underwater) → `announce` (the "HOOKED!" splash, the fish
 *  staying put) → `ascend` (only the camera returns to the surface) → `extract` (the landing) → `surfaced`.
 *  The Kraken skips the middle: `kraken` → `reel`, the camera on the hook. */
export type SimPhase = "descend" | "hooked" | "announce" | "ascend" | "extract" | "kraken" | "reel" | "surfaced";

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
	/** The hook's depth. */
	depthM: number;
	/** The camera's depth: on the hook, except in `ascend`, when it returns to the surface without it. */
	cameraM: number;
	phase: SimPhase;
	/** The tick the current phase began. */
	phaseTick: number;
	/** How heavy the catch is (`MIN_MULTIPLIER`..`MAX_MULTIPLIER`) — sets its size and the gear that lands it. */
	multiplier: number;
	/** The hook's depth when the fish took it: where the ascent and the landing start from. */
	catchM: number;
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

export function createSim(worldSeed: number, multiplier = MIN_MULTIPLIER): Sim {
	return {
		worldSeed,
		tick: 0,
		x: SIM_WIDTH / 2,
		vx: 0,
		depthM: 0,
		cameraM: 0,
		phase: "descend",
		phaseTick: 0,
		multiplier,
		catchM: 0,
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

function enter(sim: Sim, phase: SimPhase): void {
	sim.phase = phase;
	sim.phaseTick = sim.tick;
}

function surface(sim: Sim): void {
	sim.phase = "surfaced";
	sim.result = { fish: sim.world[sim.hooked]?.id ?? "kraken", depthM: sim.depthM, ticks: sim.tick };
}

/** Advances `sim` one tick in place. `axis` is the steering input, −1 / 0 / +1. */
export function step(sim: Sim, axis: number): void {
	sim.tick += 1;
	if (sim.phase === "surfaced") return;
	if (sim.phase === "hooked") {
		if (sim.tick - sim.hookedTick >= HOOKED_TICKS) enter(sim, "announce");
		return;
	}
	if (sim.phase === "announce") {
		if (sim.tick - sim.phaseTick >= ANNOUNCE_TICKS) enter(sim, "ascend");
		return;
	}
	if (sim.phase === "ascend") {
		sim.cameraM = ascentDepth(sim.catchM, sim.tick - sim.phaseTick);
		if (sim.tick - sim.phaseTick >= ascentTicks(sim.catchM)) enter(sim, "extract");
		return;
	}
	if (sim.phase === "extract") {
		const gears = gearsFor(sim.multiplier);
		const elapsed = sim.tick - sim.phaseTick;
		sim.depthM = extractionAt(gears, sim.catchM, elapsed).depthM;
		if (elapsed >= extractionTicks(gears, sim.catchM)) surface(sim);
		return;
	}
	if (sim.phase === "kraken") {
		if (sim.tick - sim.fightTick >= KRAKEN_FIGHT_TICKS) enter(sim, "reel");
		return;
	}
	if (sim.phase === "reel") {
		sim.depthM = Math.max(0, sim.depthM - REEL_METERS_PER_SECOND / TICK_HZ);
		sim.cameraM = sim.depthM;
		if (sim.depthM <= 0) surface(sim);
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
	sim.cameraM = sim.depthM;
	if (sim.depthM >= MAX_DEPTH_METERS) {
		enter(sim, "kraken");
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
			sim.catchM = sim.depthM;
			enter(sim, "hooked");
			return;
		}
	}
}
