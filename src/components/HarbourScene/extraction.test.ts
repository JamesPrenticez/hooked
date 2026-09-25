import { describe, expect, it } from "vitest";

import { HOOKED_TICKS, TICK_HZ } from "@utils/simConfig";
import { ANNOUNCE_TICKS, extractionTicks, gearsFor, MAX_MULTIPLIER, MIN_MULTIPLIER } from "@utils/simExtraction";
import { createSim, type Sim, step } from "@utils/simStep";

import {
	ART_FILL,
	cameraShake,
	catchLength,
	craneDrop,
	craneLayout,
	craneOut,
	fishSway,
	heliLayout,
	hookPose,
	landingScene,
	MAX_BASE_LENGTH,
	MAX_LENGTH,
	MOUTH_DY,
	playerCue,
	ZOOM_OUT
} from "./extraction";
import { boatLayout, waterlineY } from "./framing";

const VIEW = { width: 1920, height: 1080 };
const PORTRAIT = { width: 390, height: 844 };
const LANDSCAPE = { width: 844, height: 390 };
const ART = 190;
const STATIONED = { station: 1, retire: 0 };

/** Where a world y ends up on screen once the camera has pulled out about the waterline, as it has for a heavy catch. */
const pulledOut = (y: number, view = VIEW) => waterlineY(view) + (y - waterlineY(view)) * ZOOM_OUT;

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
		// A catch that needs the crane is drawn for the harbour pulled out, so it is that much bigger in the world.
		const length = catchLength(250, art, VIEW) / ZOOM_OUT;

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
			const t = boatLayout(view, 0, STATIONED).tip;
			const pose = hookPose(landing(500, extractionTicks(gearsFor(500), 2400)), view, t);
			expect(pulledOut(pose.y, view)).toBeGreaterThan(view.height * 0.15);
		}
	});

	it("draws a fish that needs the crane as long as the pulled-out camera shows it, and any other as long as it is", () => {
		const art = ART_FILL * createSim(1).world[0].width;
		const grown = (multiplier: number) =>
			hookPose(landing(multiplier, extractionTicks(gearsFor(multiplier), 2400)), VIEW, tip).grow * art;
		expect(grown(1)).toBeCloseTo(catchLength(1, art, VIEW));
		expect(grown(250) * ZOOM_OUT).toBeCloseTo(catchLength(250, art, VIEW));
		expect(grown(500) * ZOOM_OUT).toBeCloseTo(catchLength(500, art, VIEW));
	});

	it("brings the hook to the middle of the screen as it is hauled up, from wherever it was caught", () => {
		for (const view of [VIEW, PORTRAIT]) {
			const t = boatLayout(view, 0, STATIONED).tip;
			// The first tick of the landing: the hook is still where it was caught.
			const sim = landing(1, 0);
			sim.x = 300;
			sim.depthM = sim.catchM;
			expect(hookPose(sim, view, t).x).toBeCloseTo((300 / 1920) * view.width);
			expect(hookPose(landing(1, extractionTicks(gearsFor(1), 2400)), view, t).x).toBeCloseTo(view.width / 2);
		}
	});

	it("keeps the hook at the middle of the screen through the lift, whoever lifts, with the crane's jib over it", () => {
		for (const view of [VIEW, PORTRAIT, LANDSCAPE]) {
			const t = boatLayout(view, 0, STATIONED).tip;
			for (const multiplier of [1, 250, 500]) {
				const total = extractionTicks(gearsFor(multiplier), 2400);
				for (let tick = tickAtReveal(multiplier, 0.0001, view); tick <= total; tick += 20) {
					expect(hookPose(landing(multiplier, tick), view, t).x).toBeCloseTo(view.width / 2);
				}
			}
			expect(craneLayout(view, 1).jib.x).toBeCloseTo(view.width / 2);
		}
	});
});

describe("landingScene", () => {
	const REST = { station: 0, retire: 0, crane: 0, zoom: 1, line: 1 };

	it("leaves the harbour as it rests whenever a fish isn't being brought up", () => {
		expect(landingScene(undefined)).toEqual(REST);
		for (const phase of ["descend", "hooked", "announce", "kraken", "reel", "surfaced"] as const) {
			const sim = createSim(1);
			sim.phase = phase;
			expect(landingScene(sim)).toEqual(REST);
		}
	});

	it("stations the boat for the camera's trip back up, so it is there when it comes back into view", () => {
		const sim = createSim(1);
		sim.phase = "ascend";
		expect(landingScene(sim)).toEqual({ ...REST, station: 1 });
	});

	it("keeps the boat by the hook, and the camera in close, while the rod lands a small fish", () => {
		for (let tick = 0; tick <= extractionTicks(gearsFor(1), 2400); tick += 10) {
			expect(landingScene(landing(1, tick))).toEqual({ ...REST, station: 1 });
		}
	});

	it("brings the crane out, pulls the camera back and has the man back away, all the way, for a heavy catch", () => {
		const total = extractionTicks(gearsFor(250), 2400);
		let last = landingScene(landing(250, 0));
		for (let tick = 1; tick <= total; tick++) {
			const scene = landingScene(landing(250, tick));
			expect(scene.crane).toBeGreaterThanOrEqual(last.crane);
			expect(scene.retire).toBeGreaterThanOrEqual(last.retire);
			expect(scene.zoom).toBeLessThanOrEqual(last.zoom);
			expect(scene.line).toBeLessThanOrEqual(last.line);
			last = scene;
		}
		expect(last).toEqual({ station: 1, retire: 1, crane: 1, zoom: ZOOM_OUT, line: 0 });
	});

	it("does the same for a catch that needs the helicopter too, the crane being first out", () => {
		expect(landingScene(landing(500, extractionTicks(gearsFor(500), 2400)))).toEqual({
			station: 1,
			retire: 1,
			crane: 1,
			zoom: ZOOM_OUT,
			line: 0
		});
	});

	it("never pays the crane's cable out further than the crane has come", () => {
		for (let arrival = 0; arrival <= 1; arrival += 0.01) {
			expect(craneDrop(arrival)).toBeLessThanOrEqual(craneOut(arrival) + 1e-9);
		}
	});
});

describe("craneLayout", () => {
	it("stands on the right-hand pier, its jib reaching out over the harbour and up out of the way of the fish", () => {
		for (const view of [VIEW, PORTRAIT, { width: 844, height: 390 }]) {
			const { x, y, jib } = craneLayout(view);
			expect(x).toBeGreaterThan(view.width * 0.6);
			expect(x).toBeLessThanOrEqual(view.width);
			expect(jib.x).toBeLessThan(x);
			expect(jib.x).toBeGreaterThan(0);
			expect(jib.y).toBeLessThan(y);
			expect(jib.y).toBeGreaterThanOrEqual(-view.height * 0.05);
		}
	});

	it("is never wider than half a narrow screen", () => {
		expect(craneLayout(PORTRAIT).width).toBeLessThanOrEqual(PORTRAIT.width * 0.55 + 0.001);
	});

	it("comes out to put its jib over the middle of the screen, up high, with its feet on the waterline", () => {
		for (const view of [VIEW, PORTRAIT, LANDSCAPE]) {
			const job = craneLayout(view, 1);
			expect(job.jib.x).toBeCloseTo(view.width / 2);
			// With the camera pulled out: in the top quarter of the screen, over the middle.
			expect(pulledOut(job.jib.y, view)).toBeGreaterThan(0);
			expect(pulledOut(job.jib.y, view)).toBeLessThan(view.height / 4);
			expect(job.y).toBeCloseTo(waterlineY(view));
			expect(job.scale).toBeGreaterThan(craneLayout(view).scale);
		}
	});

	it("gets there steadily, growing and sliding in from the pier", () => {
		let last = craneLayout(VIEW, 0);
		for (let out = 0.1; out <= 1.0001; out += 0.1) {
			const crane = craneLayout(VIEW, out);
			expect(crane.scale).toBeGreaterThan(last.scale);
			expect(crane.jib.x).toBeLessThan(last.jib.x);
			last = crane;
		}
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
			expect(pulledOut(layout.y)).toBeGreaterThan(0);
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

	it("backs away and cheers the crane on once a heavy catch is more than the rod can take, then celebrates big", () => {
		expect(cueAt(250, 0.05)).toBe("reel");
		expect(cueAt(250, 0.5)).toBe("celebrate_big");
		expect(cueAt(500, 0.8)).toBe("celebrate_big");
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
