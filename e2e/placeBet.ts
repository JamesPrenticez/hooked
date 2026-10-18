import { expect, type Page } from "@playwright/test";

/** Bets the current chip on the Shallow depth through the Select Targets dialog — a cast needs at least one bet. */
export async function placeBet(page: Page) {
	await page.getByRole("button", { name: /^Select targets/ }).click();
	const dialog = page.getByRole("dialog", { name: "Select targets" });
	await dialog.getByRole("button", { name: "Shallow", exact: true }).click();
	await dialog.getByRole("button", { name: "Done" }).click();
	await expect(dialog).not.toBeVisible();
}
