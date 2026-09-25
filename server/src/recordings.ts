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
import { canonicalBytes, decodeInputs, encodeInputs, fromBase64 } from "../../src/utils/simRecording.ts";
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
