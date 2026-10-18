import { useHookStore } from "@stores/hookStore";
import { extractionAt, gearsFor, shownMultiplier } from "@utils/simExtraction";

export interface LandingMultiplier {
	/** Gear currently pulling the catch out; re-keys the readout so it slams in again. */
	stage: string;
	value: number;
}

/** The multiplier as it climbs while a catch is landed, or `undefined` outside an extraction (or while still hauling).
 *  The Kraken is reeled in whole, so it shows its multiplier from the start of the reel. */
export function useLandingMultiplier(): LandingMultiplier | undefined {
	const sim = useHookStore(state => state.sim);
	if (sim?.phase === "reel") return { stage: "kraken", value: sim.multiplier };
	if (sim?.phase !== "extract") return undefined;

	const { stage, reveal } = extractionAt(gearsFor(sim.multiplier), sim.catchM, sim.tick - sim.phaseTick);
	if (stage === "haul") return undefined;

	return { stage, value: shownMultiplier(sim.multiplier, reveal) };
}
