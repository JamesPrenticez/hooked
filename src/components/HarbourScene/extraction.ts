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

import { type BoatStance, hookWorldY, horizonY, waterlineY } from "./framing";

interface Size {
	width: number;
	height: number;
}

interface Point {
	x: number;
	y: number;
}

/** How much of its size the harbour is drawn at once the crane is on the job. 1: the harbour is not scaled — pulling it
 *  out would show the mirrored copies of the background at its edges (`BackgroundLayer`) and shrink the crane off its
 *  docks — so the fish is capped to fit under the crane's boom instead (`hookPose`). */
export const ZOOM_OUT = 1;

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

/** A landed fish's length, as a share of the screen height once the camera has pulled out: a 1× fish is about
 *  three-quarters the size it swam at (kept between these) and grows with the multiplier to `MAX_LENGTH` — the most
 *  that fits under the crane and helicopter. So the multiplier, not the species, decides how big it is: a 500× shrimp
 *  is as big as a 500× whale. */
const BASE_SHRINK = 0.75;
const MIN_BASE_LENGTH = 0.09;
export const MAX_BASE_LENGTH = 0.2;
export const MAX_LENGTH = 0.44;

/** How long the fish is, mouth to tail, once landed. `artLength` is its natural length underwater, px; `max` is the
 *  most it may grow to. */
export function catchLength(multiplier: number, artLength: number, view: Size, max = MAX_LENGTH * view.height): number {
	const base = Math.min(
		MAX_BASE_LENGTH * view.height,
		Math.max(MIN_BASE_LENGTH * view.height, artLength * BASE_SHRINK),
		max
	);
	const growth = (multiplier - MIN_MULTIPLIER) / (MAX_MULTIPLIER - MIN_MULTIPLIER);
	// Eased out: the first few multipliers are the visible ones, a 250× is already most of the way to a 500×.
	return base + (max - base) * (1 - (1 - growth) ** 2);
}

/** `tower.png`: the crane without its boom — the art's size, where its feet meet the ground, and the sleeve the
 *  boom slides out of (its top edge). */
export const CRANE_ART = {
	width: 1145,
	height: 1374,
	foot: { x: 0.33, y: 0.978 },
	mount: { x: 565, y: 497 }
};
/** The boom, in the tower art's px: `boom-segment.png` (2172×262) tiled out from the sleeve, capped by `boom-tip.png`
 *  (1503×635) — its beam matched to the segment's and to the sleeve. The tip overlaps the segment by `overlap`. */
export const BOOM_ART = {
	segment: { scale: 0.65, y: 433, width: 2172, height: 262 },
	tip: { scale: 0.386, y: 430, width: 1503, height: 635, overlap: 8 },
	/** Where the hoist cable leaves the tip's sheave: x from the tip's left edge, y in the tower art. */
	cable: { x: 513, y: 665 }
};
/** The feet's outer edge, as a share of the art width from the anchor — its feet against the left pier. */
const CRANE_FOOT_REACH = 0.317;
const CRANE_HEIGHT = 0.42;
const CRANE_MAX_WIDTH = 0.55;
/** Where the feet stand: the harbour's horizon, and how far in from the screen edge. */
const CRANE_GROUND_OFFSET = -0.025;
const CRANE_EDGE_GAP = -0.015;
/** Screen height left between the boom's cable and the top of a landed fish. */
const CRANE_FISH_GAP = 0.04;

export interface CraneLayout {
	/** Where its feet meet the ground, world space. The sprite is anchored here. */
	x: number;
	y: number;
	/** Screen px per art pixel. */
	scale: number;
	width: number;
	height: number;
	/** How far the boom's tiled segment runs out of the tower's sleeve, art px. */
	boom: number;
	/** Where the hoist cable leaves the boom's tip. */
	jib: Point;
}

/** Art px from the tower's sleeve to where the cable leaves the tip, for a segment of `boom` px. */
const boomReach = (boom: number) => boom - BOOM_ART.tip.overlap + BOOM_ART.cable.x;
/** Art px from the feet up to where the cable leaves the tip. */
const jibRise = CRANE_ART.foot.y * CRANE_ART.height - BOOM_ART.cable.y;

/**
 * The dock crane: it stands on the right-hand pier, the same size as the background, and stays there. Its boom reaches
 * out over the harbour (`out` 0), or, once it is called in (`out` 1), runs out until the cable leaves it over the middle
 * of the screen, over the hook. The art faces right and is mirrored, so the boom runs to the left of the feet.
 */
export function craneLayout(view: Size, out = 0): CraneLayout {
	const height = Math.min(
		CRANE_HEIGHT * view.height,
		(CRANE_MAX_WIDTH * view.width * CRANE_ART.height) / CRANE_ART.width
	);
	const scale = height / CRANE_ART.height;
	const x = view.width - (view.width * CRANE_EDGE_GAP + CRANE_FOOT_REACH * CRANE_ART.width * scale);
	const y = horizonY(view) + view.height * CRANE_GROUND_OFFSET;
	// Art px from the feet to the cable with the boom drawn in.
	const reach = CRANE_ART.mount.x + boomReach(0) - CRANE_ART.foot.x * CRANE_ART.width;
	const idleJibX = x - reach * scale;
	// Only as long as it takes to put the cable at the middle: a screen too narrow for that leaves it drawn in.
	const boom = Math.max(0, ((idleJibX - view.width / 2) * out) / scale);

	return {
		x,
		y,
		scale,
		width: CRANE_ART.width * scale,
		height: CRANE_ART.height * scale,
		boom,
		jib: { x: idleJibX - boom * scale, y: y - jibRise * scale }
	};
}

/** Px between the water and the boom's cable, less the gap left above a landed fish: the longest a fish the crane lifts
 *  can be, world space. */
export const craneRoom = (view: Size) =>
	waterlineY(view) - MOUTH_DY - craneLayout(view).jib.y - CRANE_FISH_GAP * view.height;

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

/** The line's end (`x`, `y`) in world space, before the camera pulls out (`LandingScene`) — where the hook hangs — and how the hooked fish hangs from it. */
export interface HookPose extends Point {
	/** How much bigger than it swam the hooked fish is drawn: 1 until the landing shows its true size. */
	grow: number;
	/** The landing in progress, if there is one. */
	extraction?: Extraction;
	/** Where the line's end will be once the whole fish is out of the water. */
	finalY?: number;
}

/** Over the crane's call-in: how far (0..1) it has come out from its pier, then how far its cable has paid out to the
 *  hook, then — for the helicopter's call-in — how far the crane's cable has gone slack and the helicopter's has paid out. */
export const craneOut = (arrival: number) => between(arrival, 0, 0.6);
export const craneDrop = (arrival: number) => between(arrival, 0.5, 1);
export const heliDrop = (arrival: number) => between(arrival, 0.3, 0.75);
export const craneRelease = (arrival: number) => between(arrival, 0.55, 1);
/** How far (0..1) the man has backed away from the hook and the camera has pulled out, over the crane's call-in — a
 *  touch after the crane has started, and after it has got there. */
const pullOut = (arrival: number) => between(arrival, 0, 0.8);

/** How far the landing has moved the harbour on from how it rests. */
export interface LandingScene extends BoatStance {
	/** How far the crane has come out from its pier onto the job, 0..1. */
	crane: number;
	/** How much of its size the harbour is drawn at, about the spot the fish comes out of the water: 1 at rest. */
	zoom: number;
	/** How much of the man's line is still on the hook, 1..0: he lets go of it as he backs away. */
	line: number;
}

const AT_REST: LandingScene = { station: 0, retire: 0, crane: 0, zoom: 1, line: 1 };

/**
 * The boat pulls back to keep its rod tip over the hook while the fish is brought up, and — when it is too heavy for
 * the rod — backs away for good as the crane comes out to take it, the camera pulling out to make room. The boat is
 * stationed for the camera's trip back up too, so it is already there when it comes back into view.
 */
export function landingScene(sim: Sim | undefined): LandingScene {
	if (sim?.phase === "ascend") return { ...AT_REST, station: 1 };
	if (sim?.phase !== "extract") return AT_REST;

	const { arrival } = extractionAt(gearsFor(sim.multiplier), sim.catchM, sim.tick - sim.phaseTick);
	const pull = pullOut(arrival.crane);
	return {
		station: 1,
		retire: pull,
		crane: craneOut(arrival.crane),
		zoom: 1 - (1 - ZOOM_OUT) * pull,
		line: 1 - between(arrival.crane, 0, 0.3)
	};
}

/**
 * Where the hook is, in world space: hanging at the fish's depth while it fights and while the camera goes up
 * without it, then hauled to the surface at the middle of the screen — whatever the boat is doing — and from there
 * lifted a mouth-to-tail length above the water as the fish is landed.
 */
export function hookPose(sim: Sim, view: Size, tip: Point): HookPose {
	const hanging = {
		x: simHookX(sim.phase === "extract" ? view.width / 2 : tip.x, sim.x, sim.depthM, view.width),
		y: hookWorldY(sim.depthM, tip.y, view)
	};
	const fish = sim.world[sim.hooked];
	if (sim.phase !== "extract" || !fish) return { ...hanging, grow: 1 };

	const gears = gearsFor(sim.multiplier);
	const extraction = extractionAt(gears, sim.catchM, sim.tick - sim.phaseTick);
	const artLength = ART_FILL * fish.width;
	// The line's end when the fish's lips are just at the surface.
	const lips = waterlineY(view) - MOUTH_DY;
	// A catch that needs the crane hangs from its boom, so it grows no longer than the room under it.
	const max = gears.length > 1 ? Math.min(MAX_LENGTH * view.height, craneRoom(view) * ZOOM_OUT) : undefined;
	const length = catchLength(sim.multiplier, artLength, view, max) / (gears.length > 1 ? ZOOM_OUT : 1);

	return {
		x: hanging.x,
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
 * reeling while the rod does the work, cheering from the sidelines once it takes the crane or helicopter, and
 * celebrating the catch. `undefined` leaves whatever is playing (the Kraken's reel, the moment of surfacing).
 */
export function playerCue(sim: Sim | undefined): PlayerAnimationName | undefined {
	if (!sim || sim.phase === "descend") return "idle";
	if (sim.phase === "hooked" || sim.phase === "announce" || sim.phase === "ascend") return "battle";
	if (sim.phase !== "extract") return undefined;

	const { stage } = extractionAt(gearsFor(sim.multiplier), sim.catchM, sim.tick - sim.phaseTick);
	if (stage === "hold") return sim.multiplier >= CRANE_FROM ? "celebrate_big" : "celebrate";
	return stage === "haul" || stage === "rod" ? "reel" : "celebrate_big";
}
