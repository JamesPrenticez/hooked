import { expect, test } from "@playwright/test";

import { cast, marketBoard, marketDialog } from "./market";

/** Every fish on the roster has a price on the market. */
const FISH_COUNT = 26;

test.beforeEach(async ({ page }) => {
	await page.goto("/");
	await expect(page.getByRole("button", { name: "Cast Line" })).toBeVisible({ timeout: 60_000 });
});

test("the dock board is an empty sign until the first cast posts prices", async ({ page }) => {
	await expect(marketBoard(page)).toContainText("Prices are posted when you cast.");
	await expect(marketBoard(page).getByRole("listitem")).toHaveCount(0);
});

test("casting deals the fish market onto the board, then the hook goes down", async ({ page }) => {
	// Every click waits on software-rendered Pixi frames, which crawl under parallel load.
	test.slow();
	await page.getByRole("button", { name: "Cast Line" }).click();

	const dialog = marketDialog(page);
	await expect(dialog).toBeVisible();
	// Every fish drops onto the board with its price, and there is no casting twice while they do.
	await expect(dialog.getByRole("listitem")).toHaveCount(FISH_COUNT);
	await expect(dialog.getByRole("img", { name: "Shark" }).locator("xpath=ancestor::li")).toContainText("×");
	await expect(page.getByRole("button", { name: "Cast Line" })).toBeDisabled();

	// It settles by itself, and the hook goes down.
	await expect(dialog).not.toBeVisible({ timeout: 15_000 });
	await expect(page.getByRole("button", { name: "Surface" })).toBeVisible();

	// Back at the harbour the board keeps the round's prices, the catch ringed.
	await page.getByRole("button", { name: "Surface" }).click();
	await expect(page.getByRole("button", { name: "Cast Line" })).toBeVisible();
	await expect(marketBoard(page).getByRole("listitem")).toHaveCount(FISH_COUNT);
	await expect(marketBoard(page).locator("[data-caught]")).toHaveCount(1);
});

test("a tap on the pop-up skips the wait", async ({ page }) => {
	test.slow();
	await page.getByRole("button", { name: "Cast Line" }).click();
	await expect(marketDialog(page)).toBeVisible();

	// The pop-up holds for over three seconds on its own; a tap lets the hook go in under two.
	await marketDialog(page).click();
	await expect(marketDialog(page)).not.toBeVisible({ timeout: 2_000 });
	await expect(page.getByRole("button", { name: "Surface" })).toBeVisible();
});

test("the board shows the prices the server dealt, and the catch pays the price listed for it", async ({ page }) => {
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
	expect(message.outcome.multiplier).toBe(price);
	expect(message.payout.total).toBe((Math.round(100 * Number(price)) / 100).toFixed(2)); // a $1.00 stake
	await expect(marketBoard(page).locator("[data-caught]")).toHaveAttribute("data-fish", message.outcome.fish);
});

test("each cast deals a new market", async ({ page }) => {
	test.slow();
	const boards: string[] = [];
	for (let round = 0; round < 2; round++) {
		await cast(page);
		await page.getByRole("button", { name: "Surface" }).click();
		await expect(page.getByRole("button", { name: "Cast Line" })).toBeVisible();
		boards.push(await marketBoard(page).innerText());
	}
	expect(boards[1]).not.toEqual(boards[0]);
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
