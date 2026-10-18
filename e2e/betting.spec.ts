import { expect, test } from "@playwright/test";

import { placeBet } from "./placeBet";

/** The balance readout, as a number. */
async function balance(page: import("@playwright/test").Page) {
	const text = await page.getByText("Balance", { exact: true }).locator("..").innerText();
	return Number(text.replace(/[^0-9.]/g, ""));
}

test("casting takes the bet off the balance and landing pays the server's payout back", async ({ page }) => {
	test.setTimeout(300_000);
	await page.goto("/");
	await expect(page.getByRole("button", { name: "Cast Line" })).toBeVisible({ timeout: 60_000 });
	const before = await balance(page);

	// The server answers a cast with the round's payout; capture it to know what must be credited.
	const started = page.waitForResponse(
		r => r.url().endsWith("/api/game/play") && r.request().postData()?.includes("start") === true
	);
	await placeBet(page);
	await page.getByRole("button", { name: "DEBUG" }).click();
	const control = page.locator("details").filter({ hasText: "Mode" });
	await control.getByText("Hook control", { exact: true }).click();
	await control.getByLabel("Speed").selectOption("8");
	await page.getByRole("button", { name: "Close", exact: true }).last().click();
	await page.getByRole("button", { name: "Cast Line" }).click();

	const { message } = await (await started).json();
	await expect.poll(() => balance(page)).toBeCloseTo(before - 1, 2);

	await expect(page.getByRole("button", { name: "Cast Line" })).toBeVisible({ timeout: 240_000 });
	await expect.poll(() => balance(page), { timeout: 30_000 }).toBeCloseTo(before - 1 + Number(message.payout.total), 2);
});
