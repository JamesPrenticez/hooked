import { describe, expect, it } from "vitest";

import { HOOKED_TICKS, TICK_HZ } from "@utils/simConfig";
import { ANNOUNCE_TICKS, extractionTicks, gearsFor, MAX_MULTIPLIER, MIN_MULTIPLIER } from "@utils/simExtraction";
import { createSim, type Sim, step } from "@utils/simStep";

import {
	ART_FILL,
	cameraShake,
	catchLength,
	craneLayout,
	fishSway,
	heliLayout,
	hookPose,
	MAX_BASE_LENGTH,
	MAX_LENGTH,
	MOUTH_DY,
	playerCue
} from "./extraction";
import { boatLayout, waterlineY } from "./framing";

const VIEW = { width: 1920, height: 1080 };
const PORTRAIT = { width: 390, height: 844 };
const ART = 190;

/** A sim on the fourth tick of the landing of a `multiplier`× catch at 2,400m, fish 0 on the hook. */
function landing(multiplier: number, ticks: number): Sim {
	const sim = createSim(1, multiplier);
	Object.assign(sim, {
		phase: "extract",
		phaseTick: 0,
		tick: ticks,
		hooked: 0,
		hookedTick: 0,
		depthM: 0,
		cameraM: 0,
		catchM: 2400
	});
	return sim;
}

/** Ticks into the landing of a `multiplier`× catch at which `reveal` first reaches `at`. */
function tickAtReveal(multiplier: number, at: number, view = VIEW) {
	const total = extractionTicks(gearsFor(multiplier), 2400);
	const tip = boatLayout(view, 0).tip;
	for (let tick = 0; tick <= total; tick++) {
		const pose = hookPose(landing(multiplier, tick), view, tip);
		if ((pose.extraction?.reveal ?? 0) >= at) return tick;
	}
	throw new Error("never revealed");
}

describe("catchLength", () => {
	it("grows with the multiplier, from a small fish to the biggest the screen holds", () => {
		let last = 0;
		for (let m = MIN_MULTIPLIER; m <= MAX_MULTIPLIER; m += 7) {
			const length = catchLength(m, ART, VIEW);
			expect(length).toBeGreaterThanOrEqual(last);
			last = length;
		}
		expect(catchLength(MAX_MULTIPLIER, ART, VIEW)).toBeCloseTo(VIEW.height * MAX_LENGTH);
		expect(catchLength(MIN_MULTIPLIER, ART, VIEW)).toBeLessThan(VIEW.height * MAX_BASE_LENGTH);
	});

	it("makes a 250× fish much bigger than a 1× fish of the same species, and a 500× bigger still", () => {
		const [one, big, biggest] = [1, 250, 500].map(m => catchLength(m, ART, VIEW));
		expect(big).toBeGreaterThan(one * 2.5);
		expect(biggest).toBeGreaterThan(big);
	});

	it("keeps a 500× fish inside the screen whatever the species, so even a whale can be landed", () => {
		for (const art of [40, ART, 900, 5000]) {
			expect(catchLength(MAX_MULTIPLIER, art, VIEW)).toBeLessThanOrEqual(VIEW.height * MAX_LENGTH + 0.001);
			expect(catchLength(MIN_MULTIPLIER, art, VIEW)).toBeLessThanOrEqual(VIEW.height * MAX_BASE_LENGTH + 0.001);
		}
	});
});

describe("hookPose", () => {
	const tip = boatLayout(VIEW, 0).tip;

	it("hangs the hook straight down from the rod tip until the landing, at the fish's true underwater size", () => {
		const sim = createSim(1);
		Object.assign(sim, { phase: "hooked", hooked: 0, depthM: 1000, cameraM: 1000, catchM: 1000, x: 960 });
		const pose = hookPose(sim, VIEW, tip);
		expect(pose.grow).toBe(1);
		expect(pose.extraction).toBeUndefined();
	});

	it("keeps the hook in the world while the camera returns, so it sinks off the bottom of the screen", () => {
		const sim = createSim(1);
		Object.assign(sim, { phase: "ascend", hooked: 0, depthM: 1000, cameraM: 400, catchM: 1000 });
		const before = hookPose(sim, VIEW, tip);
		sim.cameraM = 0;
		expect(hookPose(sim, VIEW, tip)).toEqual(before);
	});

	it("shows only the lips at the surface when the reveal starts, and the whole fish clear when it ends", () => {
		const art = ART_FILL * createSim(1).world[0].width;
		const seam = waterlineY(VIEW);
		const length = catchLength(250, art, VIEW);

		const start = hookPose(landing(250, tickAtReveal(250, 0.0001)), VIEW, tip);
		expect(start.y + MOUTH_DY).toBeCloseTo(seam, 0);

		const end = hookPose(landing(250, extractionTicks(gearsFor(250), 2400)), VIEW, tip);
		// The mouth is a full fish-length above the water, so the tail is just out of it.
		expect(end.y + MOUTH_DY + length).toBeCloseTo(seam, 5);
		expect(end.grow * art).toBeCloseTo(length, 5);
	});

	it("never lifts the fish out of the water before the haul reaches the surface", () => {
		const seam = waterlineY(VIEW);
		for (let tick = 0; tick < 2 * TICK_HZ; tick++) {
			const pose = hookPose(landing(1, tick), VIEW, tip);
			if (pose.extraction?.stage === "haul") expect(pose.y + MOUTH_DY).toBeGreaterThanOrEqual(seam - 0.001);
		}
	});

	it("raises the hook steadily from the surface, and higher for a bigger fish", () => {
		const finalY = (multiplier: number) =>
			hookPose(landing(multiplier, extractionTicks(gearsFor(multiplier), 2400)), VIEW, tip).y;
		expect(finalY(250)).toBeLessThan(finalY(1));
		expect(finalY(500)).toBeLessThan(finalY(250));

		let last = Infinity;
		for (let tick = tickAtReveal(500, 0.0001); tick <= extractionTicks(gearsFor(500), 2400); tick += 5) {
			const { y } = hookPose(landing(500, tick), VIEW, tip);
			expect(y).toBeLessThanOrEqual(last + 0.001);
			last = y;
		}
	});

	it("leaves a 500× catch's hook on screen, with room above it for the helicopter", () => {
		for (const view of [VIEW, PORTRAIT]) {
			const t = boatLayout(view, 0).tip;
			const pose = hookPose(landing(500, extractionTicks(gearsFor(500), 2400)), view, t);
			expect(pose.y).toBeGreaterThan(view.height * 0.15);
		}
	});

	it("swings the catch under the crane's jib once the crane is on the job, and only for a heavy catch", () => {
		const jib = craneLayout(VIEW).jib;
		const end = (multiplier: number) =>
			hookPose(landing(multiplier, extractionTicks(gearsFor(multiplier), 2400)), VIEW, tip).x;
		expect(end(1)).toBeCloseTo(tip.x);
		expect(end(250)).toBeCloseTo(jib.x);
		expect(end(500)).toBeCloseTo(jib.x);
	});
});

describe("craneLayout", () => {
	it("stands on the left-hand pier, its jib reaching out over the harbour and up out of the way of the fish", () => {
		for (const view of [VIEW, PORTRAIT, { width: 844, height: 390 }]) {
			const { x, y, jib } = craneLayout(view);
			expect(x).toBeLessThan(view.width * 0.4);
			expect(x).toBeGreaterThanOrEqual(0);
			expect(jib.x).toBeGreaterThan(x);
			expect(jib.x).toBeLessThan(view.width);
			expect(jib.y).toBeLessThan(y);
			expect(jib.y).toBeGreaterThanOrEqual(-view.height * 0.05);
		}
	});

	it("is never wider than half a narrow screen", () => {
		expect(craneLayout(PORTRAIT).width).toBeLessThanOrEqual(PORTRAIT.width * 0.55 + 0.001);
	});
});

describe("heliLayout", () => {
	const pose = (arrival: number) => {
		const p = hookPose(landing(500, extractionTicks(gearsFor(500), 2400)), VIEW, boatLayout(VIEW, 0).tip);
		return { hook: p, layout: heliLayout(VIEW, p, arrival) };
	};

	it("chills small on the helipad at the right of the skyline until it is called", () => {
		const { layout } = pose(0);
		expect(layout.x).toBeGreaterThan(VIEW.width * 0.6);
		expect(layout.y).toBeLessThan(VIEW.height * 0.4);
		expect(layout.scale).toBeLessThan(pose(1).layout.scale);
	});

	it("hovers directly over the hook, its winch cable reaching down to it, once it has arrived", () => {
		const { hook, layout } = pose(1);
		expect(layout.x).toBeCloseTo(hook.x);
		expect(layout.y).toBeLessThan(hook.y);
	});

	it("flies in without ever leaving the screen", () => {
		for (let a = 0; a <= 1; a += 0.1) {
			const { layout } = pose(a);
			expect(layout.x).toBeGreaterThan(0);
			expect(layout.x).toBeLessThan(VIEW.width);
			expect(layout.y).toBeGreaterThan(0);
		}
	});
});

describe("cameraShake", () => {
	const sim = (phase: Sim["phase"], ticksIn: number) => {
		const s = createSim(1);
		Object.assign(s, { phase, tick: ticksIn, hookedTick: 0, phaseTick: 0 });
		return s;
	};

	it("rattles the camera while the fish fights, hardest as the splash lands, then settles", () => {
		const size = (s: Sim) => Math.hypot(cameraShake(s).x, cameraShake(s).y);
		expect(Math.max(...Array.from({ length: HOOKED_TICKS }, (_, t) => size(sim("hooked", t))))).toBeGreaterThan(1);
		expect(Math.max(...Array.from({ length: 10 }, (_, t) => size(sim("announce", t))))).toBeGreaterThan(
			Math.max(...Array.from({ length: HOOKED_TICKS }, (_, t) => size(sim("hooked", t))))
		);
		expect(cameraShake(sim("announce", ANNOUNCE_TICKS))).toEqual({ x: 0, y: 0 });
	});

	it("holds the camera still the rest of the time", () => {
		for (const phase of ["descend", "ascend", "extract", "surfaced"] as const) {
			expect(cameraShake(sim(phase, 7))).toEqual({ x: 0, y: 0 });
		}
	});
});

describe("fishSway", () => {
	const widest = (phase: Sim["phase"]) => {
		const sim = createSim(1);
		sim.phase = phase;
		let widest = 0;
		for (sim.tick = 0; sim.tick < 4 * TICK_HZ; sim.tick++) widest = Math.max(widest, Math.abs(fishSway(sim)));
		return widest;
	};

	it("pulls hard at the hook while it fights, then hangs from it gently, never far off true", () => {
		expect(widest("hooked")).toBeGreaterThan(widest("extract"));
		expect(widest("extract")).toBeGreaterThan(0.03);
		expect(widest("hooked")).toBeLessThan(0.3);
	});
});

describe("playerCue", () => {
	const landingAt = (multiplier: number, stageTick: number) => landing(multiplier, stageTick);
	const cueAt = (multiplier: number, reveal: number) =>
		playerCue(landingAt(multiplier, tickAtReveal(multiplier, reveal)));

	it("has the man idle before a cast and after the round, so a finished pose doesn't stick", () => {
		expect(playerCue(undefined)).toBe("idle");
		const sim = createSim(1);
		expect(playerCue(sim)).toBe("idle");
	});

	it("braces against the fish from the moment it bites", () => {
		for (const phase of ["hooked", "announce", "ascend"] as const) {
			const sim = createSim(1);
			sim.phase = phase;
			expect(playerCue(sim)).toBe("battle");
		}
	});

	it("reels in a small fish himself, and celebrates it", () => {
		expect(playerCue(landing(1, 1))).toBe("reel");
		const end = extractionTicks(gearsFor(1), 2400);
		expect(playerCue(landing(1, end))).toBe("celebrate");
	});

	it("battles once a heavy catch is more than the rod can take, then celebrates big", () => {
		expect(cueAt(250, 0.05)).toBe("reel");
		expect(cueAt(250, 0.5)).toBe("battle");
		expect(playerCue(landing(250, extractionTicks(gearsFor(250), 2400)))).toBe("celebrate_big");
	});

	it("leaves the Kraken's reel alone", () => {
		const sim = createSim(1);
		sim.phase = "reel";
		expect(playerCue(sim)).toBeUndefined();
	});
});

it("steps the real sim into a pose without throwing at any phase", () => {
	const sim = createSim(1, 500);
	const tip = boatLayout(VIEW, 0).tip;
	Object.assign(sim, { phase: "hooked", hooked: 0, hookedTick: 0, depthM: 800, cameraM: 800, catchM: 800 });
	for (let i = 0; i < 40 * 60 && sim.phase !== "surfaced"; i++) {
		step(sim, 0);
		expect(Number.isFinite(hookPose(sim, VIEW, tip).y)).toBe(true);
	}
	expect(sim.phase).toBe("surfaced");
});
