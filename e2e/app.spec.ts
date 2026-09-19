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
