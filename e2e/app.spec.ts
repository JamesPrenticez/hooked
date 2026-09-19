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
