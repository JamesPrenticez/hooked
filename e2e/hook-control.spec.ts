import { expect, type Page, test } from "@playwright/test";

// The sim is fixed at 1920 sim-px wide; the mouth hit-boxes only line up with the art at that width.
test.use({ viewport: { width: 1920, height: 1080 } });

/** Seed 1's world: sitting still on the centre line, the hook takes a sardine at ~741m (tick ~202). */
async function castManualOnPausedClock(page: Page) {
	await page.clock.install();
	await page.goto("/");
	await page.getByRole("button", { name: "Start Fishing" }).click();

	await page.getByRole("button", { name: "DEBUG" }).click();
	const control = page.locator("details").filter({ hasText: "Mode" });
	await control.getByText("Hook control", { exact: true }).click();
	await control.getByLabel("Mode").selectOption("manual");
	await page.keyboard.press("Escape");

	// Assets load in real time; from here the sim only moves when the clock is run.
	await page.waitForTimeout(1_500);
	await page.clock.pauseAt(new Date(Date.now() + 2_000));
	await page.getByRole("button", { name: "Cast Line" }).click();
}

async function readout(page: Page) {
	await page.getByRole("button", { name: "DEBUG" }).click();
	const text = (await page.getByTestId("hook-readout").textContent()) ?? "";
	await page.keyboard.press("Escape");
	return text;
}

test("the hook takes a fish by the mouth and holds it", async ({ page }) => {
	test.setTimeout(180_000);
	await castManualOnPausedClock(page);

	await page.clock.runFor(2_500);
	expect(await readout(page)).toMatch(/^descend .* hooked none$/);

	await page.clock.runFor(1_500);
	const hooked = await readout(page);
	expect(hooked).toMatch(/^hooked .* hooked sardine$/);

	// Frozen: more time doesn't move the hook, and steering is ignored.
	await page.keyboard.down("ArrowRight");
	await page.clock.runFor(500);
	await page.keyboard.up("ArrowRight");
	const after = await readout(page);
	expect(after.replace(/tick \d+/, "")).toBe(hooked.replace(/tick \d+/, ""));
});

test("a hook steered off the centre line misses the fish it would have taken", async ({ page }) => {
	test.setTimeout(180_000);
	await castManualOnPausedClock(page);

	await page.keyboard.down("ArrowRight");
	await page.clock.runFor(4_000);
	await page.keyboard.up("ArrowRight");

	const missed = await readout(page);
	expect(missed).toMatch(/^descend · x 1920 ·/);
	expect(missed).toMatch(/hooked none$/);
});
