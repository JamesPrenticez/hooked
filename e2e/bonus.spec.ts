import { expect, test } from "@playwright/test";

import { cast } from "./market";

const BONUS_TITLES = ["Re-Cast", "Lucky Bait", "Feeding Frenzy", "Monster Hunt"];

test.beforeEach(async ({ page }) => {
	await page.goto("/");
	await expect(page.getByRole("button", { name: "Cast Line" })).toBeVisible();
});

test("the Bonus button opens a card for each bonus, all of it on screen, and Close returns to the game", async ({
	page
}) => {
	// Every click waits on software-rendered Pixi frames, which crawl under parallel load.
	test.slow();
	await page.getByRole("button", { name: "Bonus" }).click();

	const dialog = page.getByRole("dialog", { name: "Bonus" });
	for (const title of BONUS_TITLES) await expect(dialog.getByRole("heading", { name: title })).toBeVisible();

	// Nothing is cut off or left to scroll to, on any of the viewports.
	for (const card of await dialog.getByRole("listitem").all()) await expect(card).toBeInViewport({ ratio: 1 });
	await expect(dialog.getByRole("button", { name: "Close" })).toBeInViewport({
		ratio: 1
	});

	await dialog.getByRole("button", { name: "Close" }).click();
	await expect(dialog).not.toBeVisible();
	await expect(page.getByRole("button", { name: "Cast Line" })).toBeVisible();
});

test("the Bonus button locks while casting and comes back on surfacing", async ({ page }) => {
	test.slow();
	await cast(page);
	await expect(page.getByRole("button", { name: "Bonus" })).toBeDisabled();

	await page.getByRole("button", { name: "Surface" }).click();
	await expect(page.getByRole("button", { name: "Bonus" })).toBeEnabled();
});
