// Saving a simulated run (docs/SIMULATION.md §6, §8). The server re-runs the
// inputs through the same sim the client uses — src/utils/sim*.ts, imported
// unbundled — and stores what *that* produced. Whatever the client says it
// caught is never read.

import { createHash } from "node:crypto";

import { FISH } from "./constants.ts";
import { getDb } from "./db.ts";
import { HttpError } from "./http.ts";
import { MAX_DEPTH_METERS, SIM_VERSION } from "../../src/utils/simConfig.ts";
import { MAX_MULTIPLIER, MIN_MULTIPLIER } from "../../src/utils/simExtraction.ts";
import { canonicalBytes, decodeInputs, encodeInputs, fromBase64, toBase64 } from "../../src/utils/simRecording.ts";
import { createSim, step } from "../../src/utils/simStep.ts";

export interface SavedRecording {
	id: number;
	sha256: string;
	/** Roster id the run caught — the library bucket. */
	fish: string;
	depth: string;
	ticks: number;
	/** True when an identical run was already stored (nothing was inserted). */
	duplicate: boolean;
}

const invalid = (message: string) => new HttpError(400, "invalid_recording", message);

function integer(value: unknown, field: string, min: number, max: number): number {
	if (!Number.isInteger(value) || (value as number) < min || (value as number) > max) {
		throw invalid(`${field} must be an integer from ${min} to ${max}`);
	}
	return value as number;
}

/** Body: `{ simVersion, worldSeed, multiplier, inputs }`, `inputs` being the base64 of `encodeInputs`. */
export function saveRecording(body: unknown): SavedRecording {
	if (typeof body !== "object" || body === null) throw invalid("body must be an object");
	const fields = body as Record<string, unknown>;

	// A recording only means what it meant on the sim it was made with.
	if (fields.simVersion !== SIM_VERSION) {
		throw new HttpError(409, "sim_version_mismatch", `This server simulates version ${SIM_VERSION}`);
	}
	const worldSeed = integer(fields.worldSeed, "worldSeed", 0, 0xffffffff);
	const multiplier = integer(fields.multiplier, "multiplier", MIN_MULTIPLIER, MAX_MULTIPLIER);

	let axes: Int8Array;
	try {
		if (typeof fields.inputs !== "string") throw new Error("must be a base64 string");
		axes = decodeInputs(fromBase64(fields.inputs));
	} catch (err) {
		throw invalid(`inputs ${err instanceof Error ? err.message : "are not valid"}`);
	}

	// Steering is locked once the hook takes, so an input after that changes nothing: it is stored as 0, and
	// two runs that steered the same are one row however the player mashed the keys afterwards.
	const sim = createSim(worldSeed, multiplier);
	const used = new Int8Array(axes.length);
	let pathLen = 0;
	for (let i = 0; i < axes.length && sim.phase !== "surfaced"; i++) {
		const x = sim.x;
		if (sim.phase === "descend") used[i] = axes[i];
		step(sim, axes[i]);
		pathLen += Math.abs(sim.x - x);
	}
	if (!sim.result) throw invalid("inputs never bring the hook to the surface");
	if (sim.tick !== axes.length) throw invalid("inputs carry on past the end of the run");

	const { result } = sim;
	const depth = FISH.find(f => f.id === result.fish)?.depth;
	if (!depth) throw new HttpError(500, "unknown_fish", `The sim caught "${result.fish}", which is not in the roster`);

	const inputs = encodeInputs(used);
	const sha256 = createHash("sha256")
		.update(canonicalBytes({ simVersion: SIM_VERSION, worldSeed, multiplier, inputs, result }))
		.digest("hex");

	const caught = sim.hooked >= 0;
	const db = getDb();
	const { changes } = db
		.prepare(
			`INSERT INTO recordings (sim_version, source, world_seed, multiplier, fish, depth, inputs, ticks,
			                         catch_tick, catch_meters, fish_count, path_len, sha256, created_at)
			 VALUES (?, 'human', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			 ON CONFLICT (sha256) DO NOTHING`
		)
		.run(
			SIM_VERSION,
			worldSeed,
			multiplier,
			result.fish,
			depth,
			inputs,
			result.ticks,
			caught ? sim.hookedTick : sim.fightTick,
			caught ? sim.catchM : MAX_DEPTH_METERS,
			sim.world.length,
			pathLen,
			sha256,
			Date.now()
		);
	const row = db.prepare("SELECT id FROM recordings WHERE sha256 = ?").get(sha256) as { id: number };

	return { id: row.id, sha256, fish: result.fish, depth, ticks: result.ticks, duplicate: changes === 0 };
}

export interface StoredRecording {
	id: number;
	fish: string;
	depth: string;
	worldSeed: number;
	multiplier: number;
	ticks: number;
	source: string;
	sha256: string;
}

interface Row {
	id: number;
	sim_version: number;
	fish: string;
	depth: string;
	world_seed: number;
	multiplier: number;
	ticks: number;
	source: string;
	sha256: string;
	inputs: Uint8Array;
}

const toStored = (r: Row): StoredRecording => ({
	id: r.id,
	fish: r.fish,
	depth: r.depth,
	worldSeed: r.world_seed,
	multiplier: r.multiplier,
	ticks: r.ticks,
	source: r.source,
	sha256: r.sha256
});

function findRow(id: unknown): Row {
	const row = getDb().prepare("SELECT * FROM recordings WHERE id = ?").get(Number(id)) as Row | undefined;
	if (!row) throw new HttpError(404, "not_found", `No recording ${id}`);
	return row;
}

/** Newest first. Capped — the debug list is for eyeballing, not paging. */
export function listRecordings(): StoredRecording[] {
	const rows = getDb().prepare("SELECT * FROM recordings ORDER BY id DESC LIMIT 200").all() as unknown as Row[];
	return rows.map(toStored);
}

/** One recording with its steering (base64), enough for the client to play it again. */
export function getRecording(id: unknown): StoredRecording & { simVersion: number; inputs: string } {
	const row = findRow(id);
	return { ...toStored(row), simVersion: row.sim_version, inputs: toBase64(row.inputs) };
}

/** Re-simulates the stored inputs and checks the row still says what the sim now says. */
export function verifyRecording(id: unknown) {
	const row = findRow(id);
	const sim = createSim(row.world_seed, row.multiplier);
	for (const axis of decodeInputs(row.inputs)) {
		if (sim.phase === "surfaced") break;
		step(sim, axis);
	}
	const sha256 = createHash("sha256")
		.update(
			canonicalBytes({
				simVersion: row.sim_version,
				worldSeed: row.world_seed,
				multiplier: row.multiplier,
				inputs: row.inputs,
				result: sim.result ?? { fish: "", depthM: 0, ticks: 0 }
			})
		)
		.digest("hex");
	const hashMatches = sha256 === row.sha256;
	const resultMatches = sim.result?.fish === row.fish && sim.result.ticks === row.ticks;
	return {
		id: row.id,
		ok: hashMatches && resultMatches && row.sim_version === SIM_VERSION,
		simVersion: row.sim_version,
		hashMatches,
		resultMatches,
		fish: sim.result?.fish ?? null
	};
}
