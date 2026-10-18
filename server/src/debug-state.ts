// In-memory debug state for the /api/debug/* controls (§16, §17). Dev only —
// routes/debug.ts is not registered when config.debugControls is false, so
// nothing here runs in production. No persistence; wiped on restart like every
// other mock-server store.
//
// Kept deliberately dumb: it stores loosely-typed values and validates
// nothing. routes/debug.ts owns validation; rounds.ts and http.ts read these.

/** A forced catch: a fish, or a depth zone (which lands its first fish). A fish wins when both are set. */
export interface ForcedOutcome {
	depth?: string;
	fish?: string;
}

interface Simulation {
	/** Fixed delay added to every non-debug request, in ms. */
	latencyMs: number;
	/** 0..1 chance each non-debug request fails with a simulated 500. */
	errorRate: number;
}

let forced: ForcedOutcome = {};
const simulation: Simulation = { latencyMs: 0, errorRate: 0 };

export function getForcedOutcome(): ForcedOutcome {
	return forced;
}

/** Replaces the forced-outcome override. `{}` clears it. */
export function setForcedOutcome(next: ForcedOutcome): void {
	forced = next;
}

export function getSimulation(): Simulation {
	return simulation;
}

/** Merges the defined fields of `next` into the simulation settings. */
export function setSimulation(next: Partial<Simulation>): void {
	if (next.latencyMs !== undefined) simulation.latencyMs = next.latencyMs;
	if (next.errorRate !== undefined) simulation.errorRate = next.errorRate;
}

/** Full snapshot for GET /api/debug/state. */
export function getDebugState() {
	return { forcedOutcome: forced, simulation };
}

/** Clears every debug override — used by reset-session. */
export function resetDebugState(): void {
	forced = {};
	simulation.latencyMs = 0;
	simulation.errorRate = 0;
}
