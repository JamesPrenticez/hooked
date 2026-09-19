import { expect, type Page, test } from "@playwright/test";

async function startFishing(page: Page) {
	await page.goto("/");
	await page.getByRole("button", { name: "Start Fishing" }).click();
}

test("the app mounts", async ({ page }) => {
	await page.goto("/");
	await expect(page.locator("#root")).toBeAttached();
});

test("the phase machine advances loading -> tutorial -> game", async ({ page }) => {
	await page.goto("/");

	await expect(page.locator("canvas")).toBeVisible();

	const startFishing = page.getByRole("button", { name: "Start Fishing" });
	await expect(startFishing).toBeVisible();

	await startFishing.click();
	await expect(startFishing).not.toBeVisible();
});

test("casting and surfacing play out in the one canvas, without leaving the game", async ({ page }) => {
	await startFishing(page);
	await expect(page.getByRole("button", { name: "Cast Line" })).toBeVisible();

	await page.getByRole("button", { name: "Cast Line" }).click();
	await expect(page.getByRole("button", { name: "Surface" })).toBeVisible();
	await expect(page.locator("canvas")).toBeVisible();

	await page.getByRole("button", { name: "Surface" }).click();
	await expect(page.getByRole("button", { name: "Cast Line" })).toBeVisible();
	await expect(page.locator("canvas")).toBeVisible();
});

test("the debug panel's Player section plays every fisherman animation without errors", async ({ page }) => {
	// Every click waits on software-rendered Pixi frames, which crawl on mobile viewports.
	test.slow();
	const errors: string[] = [];
	page.on("pageerror", error => errors.push(error.message));

	await startFishing(page);
	await page.getByRole("button", { name: "DEBUG" }).click();

	const player = page.locator("details").filter({ hasText: "Player" });
	await player.getByText("Player", { exact: true }).click();

	const animations = player.getByRole("button");
	await expect(animations).not.toHaveCount(0);
	for (const animation of await animations.all()) await animation.click();

	await expect(page.locator("canvas")).toBeVisible();
	expect(errors).toEqual([]);
});

test("the debug panel's Kraken section forces the trench dive, then plays every Kraken animation without errors", async ({
	page
}) => {
	test.slow();
	const errors: string[] = [];
	page.on("pageerror", error => errors.push(error.message));

	await startFishing(page);
	await page.getByRole("button", { name: "DEBUG" }).click();

	const kraken = page.locator("details").filter({ hasText: "Kraken" });
	await kraken.getByText("Kraken", { exact: true }).click();
	await kraken.getByRole("checkbox", { name: /Force hook to the trench/ }).check();
	await page.keyboard.press("Escape");

	await page.getByRole("button", { name: "Cast Line" }).click();
	await expect(page.getByText("10,930m")).toBeVisible({ timeout: 30_000 });

	await page.getByRole("button", { name: "DEBUG" }).click();
	const animations = kraken.locator("fieldset").getByRole("button");
	await expect(animations).toHaveCount(29);
	for (const animation of await animations.all()) await animation.click();

	await expect(page.locator("canvas")).toBeVisible();
	expect(errors).toEqual([]);
});

test("bets on a depth and a fish add to the total, clear, and lock while casting", async ({ page }) => {
	// Every click waits on software-rendered Pixi frames, which crawl under parallel load.
	test.slow();
	await startFishing(page);

	await page.getByRole("button", { name: "Shallow", exact: true }).click();
	await page.getByRole("button", { name: "Shark (deep)" }).click();
	await expect(page.getByRole("button", { name: "Shallow", exact: true })).toHaveAttribute("aria-pressed", "true");
	await expect(page.getByText("$2.00", { exact: true })).toBeVisible();

	await page.getByRole("button", { name: "Clear" }).click();
	await expect(page.getByText("$0.00", { exact: true })).toBeVisible();

	await page.getByRole("button", { name: "Cast Line" }).click();
	await expect(page.getByRole("button", { name: "Shallow", exact: true })).toBeDisabled();
});
