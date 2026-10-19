import { expect, test } from "@playwright/test";

import { cast, marketBoard } from "./market";

/** Every fish on the roster has a price on the market. */
const FISH_COUNT = 26;

test.beforeEach(async ({ page }) => {
	await page.goto("/");
	await expect(page.getByRole("button", { name: "Cast Line" })).toBeVisible({ timeout: 60_000 });
});

test("the idle board already lists every fish and its price", async ({ page }) => {
	await expect(marketBoard(page).getByRole("listitem")).toHaveCount(FISH_COUNT);
	await expect(marketBoard(page).locator("[data-bonus]")).toHaveCount(0);
});

test("casting lights 1 to 5 bonus fish on the board, then the hook goes down", async ({ page }) => {
	// Every click waits on software-rendered Pixi frames, which crawl under parallel load.
	test.slow();
	await page.getByRole("button", { name: "Cast Line" }).click();

	const lit = marketBoard(page).locator("[data-bonus]");
	await expect(lit.first()).toBeVisible();
	expect(await lit.count()).toBeGreaterThanOrEqual(1);
	expect(await lit.count()).toBeLessThanOrEqual(5);
	for (const text of await lit.allInnerTexts()) expect(text).toMatch(/\+\d+×/);
	// No casting twice while they are lit.
	await expect(page.getByRole("button", { name: "Cast Line" })).toBeDisabled();

	await expect(page.getByRole("button", { name: "Surface" })).toBeVisible({ timeout: 15_000 });
	await page.getByRole("button", { name: "Surface" }).click();
	await expect(page.getByRole("button", { name: "Cast Line" })).toBeVisible();
	await expect(marketBoard(page).locator("[data-caught]")).toHaveCount(1);
});

test("the board shows the prices the server listed, and the catch pays them (times its bonus, if highlighted)", async ({
	page
}) => {
	test.slow();
	const started = page.waitForResponse(
		r => r.url().endsWith("/api/game/play") && r.request().postData()?.includes("start") === true
	);
	await cast(page);
	const { message } = await (await started).json();

	// Surfacing early still settles the round: the payout is the server's, not the presentation's.
	await page.getByRole("button", { name: "Surface" }).click();
	await expect(page.getByRole("button", { name: "Cast Line" })).toBeVisible();

	for (const { fish, multiplier } of message.market) {
		await expect(marketBoard(page).locator(`[data-fish="${fish}"]`)).toContainText(`×${Number(multiplier)}`);
	}
	const price = message.market.find((entry: { fish: string }) => entry.fish === message.outcome.fish).multiplier;
	// Only the one-in-2000 bonus hit changes it; the pay is still the server's listed amount for a $1.00 stake.
	expect(Number(message.outcome.multiplier)).toBeGreaterThanOrEqual(Number(price));
	expect(message.payout.total).toBe(Number(message.outcome.multiplier).toFixed(2));
	await expect(marketBoard(page).locator("[data-caught]")).toHaveAttribute("data-fish", message.outcome.fish);
});

test("the stake and volatility chosen are what the cast sends", async ({ page }) => {
	test.slow();
	await page.getByRole("button", { name: /^bet/i }).click();
	await page.getByRole("button", { name: "$5.00" }).click();
	await page.getByRole("button", { name: /^Volatility/ }).click();
	await page.getByRole("dialog", { name: "Volatility" }).getByRole("button", { name: /^High/ }).click();

	const started = page.waitForRequest(
		r => r.url().endsWith("/api/game/play") && r.postData()?.includes("start") === true
	);
	await cast(page);

	expect(JSON.parse((await started).postData()!)).toEqual({
		message: { start: { stake: "5.00", volatility: "high" } }
	});
});
