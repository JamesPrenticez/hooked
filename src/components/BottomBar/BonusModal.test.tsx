import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { BONUSES } from "@constants/bonuses";

import { BonusModal } from "./BonusModal";

it("shows one card per bonus, each with its name and its rules", () => {
	render(<BonusModal onClose={() => {}} />);

	const cards = within(screen.getByRole("dialog", { name: "Bonus" })).getAllByRole("listitem");

	expect(cards).toHaveLength(BONUSES.length);
	BONUSES.forEach(({ title, description }, i) => {
		expect(within(cards[i]).getByRole("heading", { name: title })).toBeInTheDocument();
		expect(cards[i]).toHaveTextContent(description);
	});
});

// GDD (Re-Cast): "A landed fish that misses the wager is not covered ... the feature card must say so."
it("Re-Cast's card says a landed fish that misses the bet is not covered", () => {
	const reCast = BONUSES.find(bonus => bonus.id === "re-cast");

	expect(reCast?.description).toMatch(/landed fish.*(not|n't) covered/i);
});

it.each([
	["the Close button", () => fireEvent.click(screen.getByRole("button", { name: "Close" }))],
	["Escape", () => fireEvent.keyDown(document, { key: "Escape" })],
	["a tap on the backdrop", () => fireEvent.click(screen.getByRole("dialog").parentElement as HTMLElement)]
])("closes on %s", (_, close) => {
	const onClose = vi.fn();
	render(<BonusModal onClose={onClose} />);

	close();

	expect(onClose).toHaveBeenCalledOnce();
});

it("stays open when a card is tapped", () => {
	const onClose = vi.fn();
	render(<BonusModal onClose={onClose} />);

	fireEvent.click(screen.getByRole("heading", { name: BONUSES[0].title }));

	expect(onClose).not.toHaveBeenCalled();
});

it("moves focus into the dialog when it opens and hands it back when it closes", () => {
	const opener = document.createElement("button");
	document.body.append(opener);
	opener.focus();

	const { unmount } = render(<BonusModal onClose={() => {}} />);
	expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();

	unmount();
	expect(opener).toHaveFocus();
	opener.remove();
});
