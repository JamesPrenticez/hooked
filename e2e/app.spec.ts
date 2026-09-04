import { expect, test } from "@playwright/test";

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
