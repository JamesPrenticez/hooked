import { expect, type Page, test } from "@playwright/test";

import { cast, closeDebug, forceCatch } from "./market";

async function startFishing(page: Page) {
	await page.goto("/");
	await expect(page.getByRole("button", { name: "Cast Line" })).toBeVisible();
}

test("the app mounts", async ({ page }) => {
	await page.goto("/");
	await expect(page.locator("#root")).toBeAttached();
});

test("loading goes straight to the game", async ({ page }) => {
	await page.goto("/", { waitUntil: "commit" });
	await expect(page.getByRole("progressbar", { name: "Loading" })).toBeVisible();
	await expect(page.getByRole("button", { name: "Cast Line" })).toBeVisible();
	await expect(page.getByRole("progressbar", { name: "Loading" })).not.toBeVisible();
	await expect(page.locator("canvas")).toBeVisible();
});
test("casting and surfacing play out in the one canvas, without leaving the game", async ({ page }) => {
	await startFishing(page);
	await expect(page.getByRole("button", { name: "Cast Line" })).toBeVisible();

	await cast(page);
	await expect(page.getByRole("button", { name: "Cash out" })).toBeVisible();
	await expect(page.locator("canvas")).toBeVisible();

	await page.getByRole("button", { name: "Cash out" }).click();
	await expect(page.getByRole("button", { name: "Cast Line" })).toBeVisible();
	await expect(page.locator("canvas")).toBeVisible();

	// The payout modal shows the result, then closes itself after its 3s countdown.
	await expect(page.getByRole("dialog", { name: "Payout" })).toBeVisible();
	await expect(page.getByRole("dialog", { name: "Payout" })).not.toBeVisible({ timeout: 6000 });
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

test("the debug panel's Kraken section parks the hook at the trench, plays every Kraken animation, and Surface brings it back", async ({
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
	await closeDebug(page);

	// Straight to the bottom: no Cast Line, no dive to wait out.
	await expect(page.getByText("11,400m", { exact: true })).toBeVisible();
	await expect(page.getByRole("button", { name: "Cash out" })).toBeVisible();

	await page.getByRole("button", { name: "DEBUG" }).click();
	const animations = kraken.locator("fieldset").getByRole("button");
	await expect(animations).toHaveCount(29);
	for (const animation of await animations.all()) await animation.click();
	await closeDebug(page);

	// Still there after all that; only Surface (or unticking) lets it go.
	await expect(page.getByText("11,400m", { exact: true })).toBeVisible();
	await page.getByRole("button", { name: "Cash out" }).click();
	await expect(page.getByRole("button", { name: "Cast Line" })).toBeVisible();
	await expect(page.getByText("11,400m", { exact: true })).not.toBeVisible();

	await expect(page.locator("canvas")).toBeVisible();
	expect(errors).toEqual([]);
});

test("a cast the server lands the Kraken on dives to the bottom of the trench, then reels back to the harbour", async ({
	page
}) => {
	test.setTimeout(300_000);
	const errors: string[] = [];
	page.on("pageerror", error => errors.push(error.message));

	await startFishing(page);
	// Eight times the speed (Hook control) gets the hook to the bottom in well under a minute.
	await page.getByRole("button", { name: "DEBUG" }).click();
	const control = page.locator("details").filter({ hasText: "Mode" });
	await control.getByText("Hook control", { exact: true }).click();
	await control.getByLabel("Speed").selectOption("8");
	await closeDebug(page);

	// The hook goes after the fish the server chose, so only the Kraken sends it all the way down.
	await forceCatch(page, "kraken");
	try {
		await cast(page);
		await expect(page.getByText("11,400m", { exact: true })).toBeVisible({ timeout: 120_000 });

		// Then the reel back up to the harbour.
		await expect(page.getByRole("button", { name: "Cast Line" })).toBeVisible({ timeout: 120_000 });
		await expect(page.getByText("11,400m", { exact: true })).not.toBeVisible();
	} finally {
		await forceCatch(page);
	}

	await expect(page.locator("canvas")).toBeVisible();
	expect(errors).toEqual([]);
});

test("the volatility picker changes the volatility, and locks while casting", async ({ page }) => {
	// Every click waits on software-rendered Pixi frames, which crawl under parallel load.
	test.slow();
	await startFishing(page);

	const trigger = page.getByRole("button", { name: /^Volatility/ });
	await expect(trigger).toHaveAccessibleName("Volatility, Medium");

	await trigger.click();
	const dialog = page.getByRole("dialog", { name: "Volatility" });
	await expect(dialog.getByRole("button", { name: /^Medium/ })).toHaveAttribute("aria-pressed", "true");
	await dialog.getByRole("button", { name: /^High/ }).click();
	await expect(dialog).not.toBeVisible();
	await expect(trigger).toHaveAccessibleName("Volatility, High");

	await cast(page);
	await expect(trigger).toBeDisabled();
});

test("manual hook mode: the arrow keys steer the hook", async ({ page }) => {
	test.slow();
	await startFishing(page);

	await page.getByRole("button", { name: "DEBUG" }).click();
	const control = page.locator("details").filter({ hasText: "Mode" });
	await control.getByText("Hook control", { exact: true }).click();
	await control.getByLabel("Mode").selectOption("manual");
	await closeDebug(page);

	await cast(page);
	await page.keyboard.down("ArrowRight");
	await page.waitForTimeout(600);
	await page.keyboard.up("ArrowRight");

	await page.getByRole("button", { name: "DEBUG" }).click();
	const readout = page.getByTestId("hook-readout");
	const x = Number(/x (\d+)/.exec((await readout.textContent()) ?? "")?.[1]);
	expect(x).toBeGreaterThan(960);
});
