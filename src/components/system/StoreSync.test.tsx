import { render } from "@testing-library/react";
import { expect, it } from "vitest";

import { onSessionExpired } from "@api";
import { useGameStore } from "@stores/gameStore";

import StoreSync from "./StoreSync";

it("resets the phase to loading when the API layer reports the session expired", () => {
	useGameStore.setState({ phase: "game" });
	render(<StoreSync />);

	onSessionExpired?.();

	expect(useGameStore.getState().phase).toBe("loading");
});
