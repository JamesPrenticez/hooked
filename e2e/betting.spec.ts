import { expect, test } from "@playwright/test";

/** The balance readout, as a number. */
async function balance(page: import("@playwright/test").Page) {
	const text = await page.getByText("Balance", { exact: true }).locator("..").innerText();
	return Number(text.replace(/[^0-9.]/g, ""));
}

test("casting takes the stake off the balance and landing pays the server's payout back", async ({ page }) => {
	test.setTimeout(300_000);
	await page.goto("/");
	await expect(page.getByRole("button", { name: "Cast Line" })).toBeVisible({ timeout: 60_000 });
	const before = await balance(page);

	// The server answers a cast with the round's payout; capture it to know what must be credited.
	const started = page.waitForResponse(
		r => r.url().endsWith("/api/game/play") && r.request().postData()?.includes("start") === true
	);
	await page.getByRole("button", { name: "DEBUG" }).click();
	const control = page.locator("details").filter({ hasText: "Mode" });
	await control.getByText("Hook control", { exact: true }).click();
	await control.getByLabel("Speed").selectOption("8");
	await page.getByRole("button", { name: "Close", exact: true }).last().click();
	await page.getByRole("button", { name: "Cast Line" }).click();

	// The stake is the default $1.00. The hook goes down once the bonus fish have been lit.
	const { message } = await (await started).json();
	expect(message.stake).toBe("1.00");
	await expect.poll(() => balance(page)).toBeCloseTo(before - 1, 2);

	// The hook goes down and the catch is landed; the cast button is back once the round is over.
	await expect(page.getByRole("button", { name: "Surface" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Cast Line" })).toBeVisible({ timeout: 240_000 });
	await expect.poll(() => balance(page), { timeout: 30_000 }).toBeCloseTo(before - 1 + Number(message.payout.total), 2);
});
