import { useMemo } from "react";

import { FISH } from "@constants/fish";
import { MultiplierList } from "@hooked-ui";
import { useHookStore } from "@stores/hookStore";
import { useRoundStore } from "@stores/roundStore";

/** The fish highlighted this round and the bonus each pays on top of its price, biggest first. Cleared once the hook is back at the surface. */
export function BonusMultipliers() {
	const bonus = useRoundStore(s => s.round?.bonus);
	const diving = useHookStore(s => s.sim !== undefined && s.sim.phase !== "surfaced");
	const items = useMemo(
		() =>
			(bonus ?? []).flatMap(({ fish, multiplier }) => {
				const found = FISH.find(f => f.id === fish);
				return found
					? [
							{
								id: fish,
								label: found.name,
								image: found.image,
								color: `var(--color-depth-${found.depth})`,
								multiplier: Number(multiplier)
							}
						]
					: [];
			}),
		[bonus]
	);

	return <MultiplierList items={diving ? items : undefined} />;
}
