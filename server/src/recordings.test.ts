// Run: pnpm test:server  (node --test, no framework)

import assert from "node:assert/strict";
import { test } from "node:test";

import { config } from "./config.ts";
import { getDb } from "./db.ts";
import { saveRecording } from "./recordings.ts";
import { MAX_DEPTH_METERS, SIM_VERSION } from "../../src/utils/simConfig.ts";
import { encodeInputs, MAX_RECORDING_TICKS, toBase64 } from "../../src/utils/simRecording.ts";
import { createSim, step } from "../../src/utils/simStep.ts";

config.dbPath = ":memory:";

/** What the client does: steer `axisAt` per tick until the hook surfaces. Seed 1 sitting still takes a sardine. */
function play(worldSeed: number, axisAt: (tick: number) => number, multiplier = 1) {
	const sim = createSim(worldSeed, multiplier);
	const axes: number[] = [];
	while (sim.phase !== "surfaced") {
		axes.push(axisAt(sim.tick));
		step(sim, axes[axes.length - 1]);
	}
	return { sim, axes };
}

const wire = (worldSeed: number, axes: number[], over: Record<string, unknown> = {}) => ({
	simVersion: SIM_VERSION,
	worldSeed,
	multiplier: 1,
	inputs: toBase64(encodeInputs(axes)),
	...over
});

const rows = () => (getDb().prepare("SELECT COUNT(*) AS n FROM recordings").get() as { n: number }).n;

test("saves what the sim caught, with its summary columns", () => {
	const { sim, axes } = play(1, () => 0);
	const saved = saveRecording(wire(1, axes));

	assert.equal(saved.fish, "sardine");
	assert.equal(saved.depth, "shallow");
	assert.equal(saved.ticks, sim.tick);
	assert.equal(saved.duplicate, false);
	assert.match(saved.sha256, /^[0-9a-f]{64}$/);

	const row = getDb().prepare("SELECT * FROM recordings WHERE id = ?").get(saved.id) as Record<string, unknown>;
	assert.equal(row.source, "human");
	assert.equal(row.fish_count, sim.world.length);
	assert.equal(row.catch_tick, sim.hookedTick);
	assert.equal(row.catch_meters, sim.catchM);
	assert.equal(row.path_len, 0); // never steered
	assert.equal(row.idx, null); // assigned at freeze
});

test("the path length is how far the hook travelled", () => {
	const { axes } = play(1, tick => (tick < 30 ? 1 : 0));
	const saved = saveRecording(wire(1, axes));
	const row = getDb().prepare("SELECT path_len FROM recordings WHERE id = ?").get(saved.id) as { path_len: number };
	assert.ok(row.path_len > 100);
});

test("the Kraken at the bottom is a run like any other", () => {
	const { sim, axes } = play(5, () => 1);
	assert.equal(sim.result?.fish, "kraken");
	const saved = saveRecording(wire(5, axes));
	assert.deepEqual([saved.fish, saved.depth], ["kraken", "jackpot"]);

	const row = getDb().prepare("SELECT catch_tick, catch_meters FROM recordings WHERE id = ?").get(saved.id);
	assert.deepEqual({ ...row }, { catch_tick: sim.fightTick, catch_meters: MAX_DEPTH_METERS });
});

test("a client's own account of what it caught is never read", () => {
	const { axes } = play(1, () => 0);
	const honest = saveRecording(wire(1, axes));
	const lying = saveRecording(wire(1, axes, { result: { fish: "whale", depthM: 0, ticks: 1 } }));
	assert.deepEqual(lying, { ...honest, duplicate: true });
	assert.equal(lying.fish, "sardine");
});

test("saving the same run twice stores it once", () => {
	const { axes } = play(2, () => 1);
	const before = rows();
	const first = saveRecording(wire(2, axes));
	const again = saveRecording(wire(2, axes));

	assert.equal(again.id, first.id);
	assert.equal(again.sha256, first.sha256);
	assert.deepEqual([first.duplicate, again.duplicate], [false, true]);
	assert.equal(rows(), before + 1);
});

test("keys mashed after the hook took change nothing — it is the same run", () => {
	const { sim, axes } = play(1, () => 0);
	const mashed = axes.map((axis, tick) => (tick > sim.hookedTick ? (tick % 2 ? 1 : -1) : axis));
	const first = saveRecording(wire(1, axes));
	const second = saveRecording(wire(1, mashed));
	assert.deepEqual([second.id, second.duplicate], [first.id, true]);
});

test("different steering or a different multiplier is a different run", () => {
	const { axes } = play(1, () => 0);
	const { axes: steered } = play(1, tick => (tick < 20 ? 1 : 0));
	const { axes: crane } = play(1, () => 0, 250); // the same hook, a longer landing
	const shas = [
		saveRecording(wire(1, axes)),
		saveRecording(wire(1, steered)),
		saveRecording(wire(1, crane, { multiplier: 250 }))
	].map(saved => saved.sha256);
	assert.equal(new Set(shas).size, 3);
});

test("a recording from another sim version is refused — it would mean something else", () => {
	const { axes } = play(1, () => 0);
	assert.throws(() => saveRecording(wire(1, axes, { simVersion: SIM_VERSION + 1 })), {
		status: 409,
		code: "sim_version_mismatch"
	});
});

test("rejects a recording that isn't a whole run", () => {
	const { axes } = play(1, () => 0);
	const invalid = { status: 400, code: "invalid_recording" };

	assert.throws(() => saveRecording(wire(1, axes.slice(0, 100))), invalid, "stops mid-descent");
	assert.throws(() => saveRecording(wire(1, [...axes, 0])), invalid, "runs on after SURFACED");
	assert.throws(() => saveRecording(wire(1, [])), invalid, "empty");
});

test("rejects bad fields and malformed inputs", () => {
	const { axes } = play(1, () => 0);
	const invalid = { status: 400, code: "invalid_recording" };

	for (const body of [null, "run", 7]) assert.throws(() => saveRecording(body), invalid);
	for (const over of [
		{ worldSeed: -1 },
		{ worldSeed: 2 ** 32 },
		{ worldSeed: 1.5 },
		{ worldSeed: "1" },
		{ multiplier: 0 },
		{ multiplier: 501 },
		{ multiplier: 2.5 },
		{ inputs: 7 },
		{ inputs: "not base64!" },
		{ inputs: toBase64(Uint8Array.of(0x80)) }, // a varint that never ends
		{ inputs: toBase64(encodeInputs(Array(MAX_RECORDING_TICKS + 1).fill(0))) } // a few bytes that expand to a lot
	]) {
		assert.throws(() => saveRecording(wire(1, axes, over)), invalid, JSON.stringify(over).slice(0, 60));
	}
});
