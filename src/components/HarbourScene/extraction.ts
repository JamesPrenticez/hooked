import { simHookX } from "@components/DescentScene/lineDrift";
import type { PlayerAnimationName } from "@constants/playerAnimations";
import { HOOK_TIP_DY, TICK_HZ } from "@utils/simConfig";
import {
	CRANE_FROM,
	type Extraction,
	extractionAt,
	gearsFor,
	MAX_MULTIPLIER,
	MIN_MULTIPLIER
} from "@utils/simExtraction";
import type { Sim } from "@utils/simStep";

import { hookWorldY, horizonY, waterlineY } from "./framing";

interface Size {
	width: number;
	height: number;
}

interface Point {
	x: number;
	y: number;
}

/** Px the hook's barb sits inside a hooked fish's mouth, so the hook is in the mouth and not under it. Tune by eye. */
export const HOOK_IN_MOUTH = 30;
/** Px from the line's end down to a hooked fish's mouth. */
export const MOUTH_DY = HOOK_TIP_DY - HOOK_IN_MOUTH;

/** A fish sprite's art spans about this much of its cell, mouth to tail. */
export const ART_FILL = 0.85;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
/** Eased progress of `a` through `[from, to]`. */
const between = (a: number, from: number, to: number) => {
	const u = clamp01((a - from) / (to - from));
	return u * u * (3 - 2 * u);
};

/** A landed fish's length, as a share of the screen height: a 1× fish is about three-quarters the size it swam at
 *  (kept between these) and grows with the multiplier to `MAX_LENGTH` — the most that fits under the crane and
 *  helicopter. So the multiplier, not the species, decides how big it is: a 500× shrimp is as big as a 500× whale. */
const BASE_SHRINK = 0.75;
const MIN_BASE_LENGTH = 0.09;
export const MAX_BASE_LENGTH = 0.2;
export const MAX_LENGTH = 0.44;

/** How long the fish is, mouth to tail, once landed. `artLength` is its natural length underwater, px. */
export function catchLength(multiplier: number, artLength: number, view: Size): number {
	const base = Math.min(
		MAX_BASE_LENGTH * view.height,
		Math.max(MIN_BASE_LENGTH * view.height, artLength * BASE_SHRINK)
	);
	const growth = (multiplier - MIN_MULTIPLIER) / (MAX_MULTIPLIER - MIN_MULTIPLIER);
	// Eased out: the first few multipliers are the visible ones, a 250× is already most of the way to a 500×.
	return base + (MAX_LENGTH * view.height - base) * (1 - (1 - growth) ** 2);
}

/** `dock-crane-static.png`: the art's size, where its feet meet the ground, and where the hoist cable leaves the jib. */
export const CRANE_ART = {
	width: 1145,
	height: 1374,
	foot: { x: 0.33, y: 0.978 },
	jib: { x: 1085 / 1145, y: 385 / 1374 }
};
/** The feet's outer edge, as a share of the art width from the anchor — its feet against the left pier. */
const CRANE_FOOT_REACH = 0.317;
const CRANE_HEIGHT = 0.42;
const CRANE_MAX_WIDTH = 0.55;
/** Where the feet stand: the harbour's horizon, and how far in from the screen edge. */
const CRANE_GROUND_OFFSET = -0.025;
const CRANE_EDGE_GAP = -0.015;

export interface CraneLayout {
	/** Where its feet meet the ground, world space. The sprite is anchored here. */
	x: number;
	y: number;
	/** Screen px per art pixel. */
	scale: number;
	width: number;
	height: number;
	/** Where the hoist cable leaves the jib. */
	jib: Point;
}

/** The dock crane on the left-hand pier, its jib reaching out over the harbour. */
export function craneLayout(view: Size): CraneLayout {
	const height = Math.min(
		CRANE_HEIGHT * view.height,
		(CRANE_MAX_WIDTH * view.width * CRANE_ART.height) / CRANE_ART.width
	);
	const scale = height / CRANE_ART.height;
	const width = CRANE_ART.width * scale;
	const x = view.width * CRANE_EDGE_GAP + CRANE_FOOT_REACH * width;
	const y = horizonY(view) + view.height * CRANE_GROUND_OFFSET;

	return {
		x,
		y,
		scale,
		width,
		height,
		jib: { x: x + (CRANE_ART.jib.x - CRANE_ART.foot.x) * width, y: y - (CRANE_ART.foot.y - CRANE_ART.jib.y) * height }
	};
}

/** `helicopter.png`: the art's size, the width of its solid part (rotor tip to rotor tip), and where the winch cable
 *  leaves its belly. */
export const HELI_ART = { width: 1536, height: 1024, solid: 1474, ring: { x: 735 / 1536, y: 800 / 1024 } };
const HELI_WIDTH = 0.24;
const HELI_MAX_WIDTH = 0.5;
/** It idles in the sky this much smaller — further off — than it works. */
const HELI_IDLE_SCALE = 0.5;
const HELI_IDLE = { x: 0.17, y: 0.16 };
/** The helipad on the skyline's rooftop, in `bg-desktop`'s pixels — where it idles on a landscape screen. */
const HELIPAD = { x: 1115, y: 150, artWidth: 1672, dockLine: 0.438 * 941 };
/** How much winch cable it hangs the fish on once the fish is fully up, of the screen height. */
const HELI_CABLE = 0.055;

export interface HeliLayout extends Point {
	/** Screen px per art pixel. */
	scale: number;
}

function helipad(view: Size): Point {
	if (view.width < view.height) return { x: HELI_IDLE.x * view.width, y: HELI_IDLE.y * view.height };
	const scale = view.width / HELIPAD.artWidth;
	return { x: HELIPAD.x * scale, y: horizonY(view) + (HELIPAD.y - HELIPAD.dockLine) * scale };
}

/** Where the helicopter's winch ring is: idling in the sky until called, then flying over the hook and hovering there. */
export function heliLayout(view: Size, hook: HookPose, arrival: number): HeliLayout {
	const near = Math.min(HELI_WIDTH * view.height, HELI_MAX_WIDTH * view.width) / HELI_ART.solid;
	const far = near * HELI_IDLE_SCALE;
	const fly = between(arrival, 0, 0.6);
	const idle = helipad(view);
	const hover = { x: hook.x, y: (hook.finalY ?? hook.y) - HELI_CABLE * view.height };

	return {
		x: idle.x + (hover.x - idle.x) * fly,
		y: idle.y + (hover.y - idle.y) * fly,
		scale: far + (near - far) * fly
	};
}

/** The line's end (`x`, `y`) in world space, camera at rest — where the hook hangs — and how the hooked fish hangs from it. */
export interface HookPose extends Point {
	/** How much bigger than it swam the hooked fish is drawn: 1 until the landing shows its true size. */
	grow: number;
	/** The landing in progress, if there is one. */
	extraction?: Extraction;
	/** Where the line's end will be once the whole fish is out of the water. */
	finalY?: number;
}

/** How far (0..1) the crane's cable has paid out, and how far it has dragged the fish under the jib, over its call-in. */
export const craneDrop = (arrival: number) => between(arrival, 0, 0.5);
const craneSwing = (arrival: number) => between(arrival, 0.3, 0.95);
/** How far (0..1) the helicopter's winch cable has paid out, and how far the crane's has gone slack, over its call-in. */
export const heliDrop = (arrival: number) => between(arrival, 0.3, 0.75);
export const craneRelease = (arrival: number) => between(arrival, 0.55, 1);

/**
 * Where the hook is, in world space: hanging at the fish's depth while it fights and while the camera goes up
 * without it, then hauled to the surface, and from there lifted a mouth-to-tail length above the water as the
 * fish is landed — swung under the crane's jib once the crane is on the job.
 */
export function hookPose(sim: Sim, view: Size, tip: Point): HookPose {
	const hanging = { x: simHookX(tip.x, sim.x, sim.depthM, view.width), y: hookWorldY(sim.depthM, tip.y, view) };
	const fish = sim.world[sim.hooked];
	if (sim.phase !== "extract" || !fish) return { ...hanging, grow: 1 };

	const extraction = extractionAt(gearsFor(sim.multiplier), sim.catchM, sim.tick - sim.phaseTick);
	const artLength = ART_FILL * fish.width;
	const length = catchLength(sim.multiplier, artLength, view);
	// The line's end when the fish's lips are just at the surface.
	const lips = waterlineY(view) - MOUTH_DY;
	const swing = craneSwing(extraction.arrival.crane);

	return {
		x: hanging.x + (craneLayout(view).jib.x - hanging.x) * swing,
		// While it is hauled in, the hook rises no higher than the lips-at-the-surface mark; the rest is the lift.
		y: extraction.stage === "haul" ? Math.max(hanging.y, lips) : lips - extraction.reveal * length,
		grow: length / artLength,
		extraction,
		finalY: lips - length
	};
}

/** Camera shake while the fish fights the hook, then a hard jolt as the "HOOKED!" splash lands that settles. */
const FIGHT_SHAKE_PX = 4;
const JOLT_SHAKE_PX = 12;
const JOLT_TICKS = 30;

export function cameraShake(sim: Sim): Point {
	let amount = 0;
	if (sim.phase === "hooked") amount = FIGHT_SHAKE_PX;
	else if (sim.phase === "announce") amount = JOLT_SHAKE_PX * Math.max(0, 1 - (sim.tick - sim.phaseTick) / JOLT_TICKS);
	if (amount <= 0) return { x: 0, y: 0 };
	return { x: Math.sin(sim.tick * 2.1) * amount, y: Math.sin(sim.tick * 3.3 + 1) * amount * 0.6 };
}

/** The hooked fish sways from its mouth: a slow hang, and a hard pull while it fights. Radians. */
export function fishSway(sim: Sim): number {
	const fighting = sim.phase === "hooked";
	return Math.sin((sim.tick / TICK_HZ) * (fighting ? 11 : 2.4)) * (fighting ? 0.12 : 0.06);
}

/**
 * What the man in the boat should be doing: idle either side of a run, bracing from the moment the fish bites,
 * reeling while the rod does the work, battling once it takes the crane or helicopter, and celebrating the
 * catch. `undefined` leaves whatever is playing (the Kraken's reel, the moment of surfacing).
 */
export function playerCue(sim: Sim | undefined): PlayerAnimationName | undefined {
	if (!sim || sim.phase === "descend") return "idle";
	if (sim.phase === "hooked" || sim.phase === "announce" || sim.phase === "ascend") return "battle";
	if (sim.phase !== "extract") return undefined;

	const { stage } = extractionAt(gearsFor(sim.multiplier), sim.catchM, sim.tick - sim.phaseTick);
	if (stage === "hold") return sim.multiplier >= CRANE_FROM ? "celebrate_big" : "celebrate";
	return stage === "haul" || stage === "rod" ? "reel" : "battle";
}
