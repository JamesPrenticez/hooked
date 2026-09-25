import { expect, type Page, test } from "@playwright/test";

// The sim is fixed at 1920 sim-px wide; the mouth hit-boxes only line up with the art at that width.
test.use({ viewport: { width: 1920, height: 1080 } });

/**
 * Seed 1's world: sitting still on the centre line, the hook takes a sardine at ~741m (tick ~202).
 * `speed` runs more sim ticks per frame (the debug panel's ×2/×4/×8) — the run is identical, it just
 * takes fewer software-rendered frames to get through.
 */
async function castManualOnPausedClock(page: Page, { multiplier = 1, speed = 1 } = {}) {
	await page.clock.install();
	await page.goto("/");
	// Six software-rendered pages boot at once, so the loading screen can take a while.
	await expect(page.getByRole("button", { name: "Cast Line" })).toBeVisible({ timeout: 60_000 });

	await page.getByRole("button", { name: "DEBUG" }).click();
	const control = page.locator("details").filter({ hasText: "Mode" });
	await control.getByText("Hook control", { exact: true }).click();
	await control.getByLabel("Mode").selectOption("manual");
	await control.getByLabel("Catch multiplier").fill(String(multiplier));
	await control.getByLabel("Speed").selectOption(String(speed));
	await page.keyboard.press("Escape");

	// Assets load in real time; from here the sim only moves when the clock is run.
	await page.waitForTimeout(1_500);
	await page.clock.pauseAt(new Date(Date.now() + 2_000));
	await page.getByRole("button", { name: "Cast Line" }).click();
}

/** The debug panel's readout. It lives in the closed dialog, which is still in the DOM — no need to open it to read. */
async function readout(page: Page) {
	return (await page.getByTestId("hook-readout").textContent()) ?? "";
}

/** The sim's phase from the readout (`extract:crane` while a landing is on), or `ended` once the round is over. */
const phaseOf = (text: string) => (text === "no run" ? "ended" : text.split(" ")[0]);

/** The hook's depth from the readout, metres. */
const hookDepthOf = (text: string) => Number(/· ([\d,]+)m ·/.exec(text)?.[1].replaceAll(",", ""));

/**
 * Steps the paused clock in small steps until the sim reaches `until`, returning every phase it went through
 * on the way, in order. Stepping is small enough that no phase is skipped.
 */
async function watchUntil(page: Page, until: string, stepMs = 60) {
	const seen: string[] = [];
	for (let elapsed = 0; elapsed < 120_000; elapsed += stepMs) {
		const phase = phaseOf(await readout(page));
		if (seen[seen.length - 1] !== phase) seen.push(phase);
		if (phase === until) return seen;
		await page.clock.runFor(stepMs);
	}
	throw new Error(`never reached ${until}; went ${seen.join(" > ")}`);
}

test("the hook takes a fish by the mouth and holds it", async ({ page }) => {
	test.setTimeout(300_000);
	await castManualOnPausedClock(page);

	await page.clock.runFor(2_500);
	expect(await readout(page)).toMatch(/^descend .* hooked none$/);

	await page.clock.runFor(1_000);
	const hooked = await readout(page);
	expect(hooked).toMatch(/^hooked .* hooked sardine$/);

	// Frozen: more time doesn't move the hook, and steering is ignored.
	await page.keyboard.down("ArrowRight");
	await page.clock.runFor(200);
	await page.keyboard.up("ArrowRight");
	const after = await readout(page);
	expect(after.replace(/tick \d+/, "")).toBe(hooked.replace(/tick \d+/, ""));
});

test("HOOKED! splashes once the fish has fought the hook, and only the camera then goes back up", async ({ page }) => {
	test.setTimeout(300_000);
	await castManualOnPausedClock(page, { speed: 8 });

	// The fish fights first: the splash isn't up yet.
	await watchUntil(page, "hooked");
	await expect(page.getByText("HOOKED!")).not.toBeVisible();

	await watchUntil(page, "announce");
	await expect(page.getByText("HOOKED!")).toBeVisible();
	const caughtAt = hookDepthOf(await readout(page));
	expect(caughtAt).toBeGreaterThan(300);

	// The camera comes up on its own: the depth HUD counts down while the hook stays where it caught the fish.
	await watchUntil(page, "ascend");
	await expect(page.getByText("HOOKED!")).not.toBeVisible();
	await page.clock.runFor(40);
	const hud = page.getByText(/^[\d,]+m$/);
	await expect(async () => {
		expect(Number((await hud.textContent())?.replaceAll(/[m,]/g, ""))).toBeLessThan(caughtAt);
		expect(hookDepthOf(await readout(page))).toBe(caughtAt);
	}).toPass();
});

// The multiplier picks who lands the fish: the man in the boat always, then the crane, then the helicopter.
for (const { multiplier, gear } of [
	{ multiplier: 1, gear: ["extract:rod"] },
	{ multiplier: 250, gear: ["extract:rod", "extract:crane"] },
	{ multiplier: 500, gear: ["extract:rod", "extract:crane", "extract:helicopter"] }
]) {
	test(`a ${multiplier}× catch is landed by ${gear.map(g => g.replace("extract:", "")).join(", then ")}`, async ({
		page
	}) => {
		test.setTimeout(300_000);
		await castManualOnPausedClock(page, { multiplier, speed: 8 });

		const phases = await watchUntil(page, "ended");
		expect(phases).toEqual([
			"descend",
			"hooked",
			"announce",
			"ascend",
			"extract:haul",
			...gear,
			"extract:hold",
			"ended"
		]);
		await expect(page.getByRole("button", { name: "Cast Line" })).toBeVisible();
	});
}

test("a hook steered off the centre line misses the fish it would have taken", async ({ page }) => {
	test.setTimeout(300_000);
	await castManualOnPausedClock(page);

	await page.keyboard.down("ArrowRight");
	await page.clock.runFor(4_000);
	await page.keyboard.up("ArrowRight");

	const missed = await readout(page);
	expect(missed).toMatch(/^descend · x 1920 ·/);
	expect(missed).toMatch(/hooked none$/);
});

// Goes to the real server, which re-simulates the run in Node: the catch it reports is the browser's own
// recording replayed on another engine, so a match is a cross-engine determinism check too.
test("Save run stores a finished run once the server has re-simulated it to the same catch", async ({ page }) => {
	test.setTimeout(300_000);
	await castManualOnPausedClock(page, { speed: 8 });

	// Nothing to save while the run is still going.
	await expect(page.getByTestId("save-status")).toHaveText(/^Finish a run/);
	await watchUntil(page, "ended");

	await page.getByRole("button", { name: "DEBUG" }).click();
	await page.getByRole("button", { name: "Save run" }).click();
	await expect(page.getByTestId("save-status")).toHaveText(/^Saved #\d+: sardine \(shallow\)/);
});

// Also against the real server: Play fetches the stored inputs and the sim re-runs them without the keys.
test("a stored recording can be verified, and played again to the same catch", async ({ page }) => {
	test.setTimeout(300_000);
	await castManualOnPausedClock(page, { speed: 8 });
	await watchUntil(page, "ended");

	await page.getByRole("button", { name: "DEBUG" }).click();
	await page.getByRole("button", { name: "Save run" }).click();
	await expect(page.getByTestId("save-status")).toHaveText(/^Saved #\d+: sardine \(shallow\)/);

	const recordings = page.locator("details").filter({ hasText: "Load" });
	await recordings.getByText("Recordings", { exact: true }).click();
	await recordings.getByRole("button", { name: "Load" }).click();
	const row = page.getByTestId("recording-row").filter({ hasText: "sardine" }).first();
	await row.getByRole("button", { name: "Verify" }).click();
	await expect(page.getByTestId("recordings-status")).toHaveText(/verified — sardine/);

	await row.getByRole("button", { name: "Play" }).click();
	await expect(page.getByTestId("recordings-status")).toHaveText(/^Replay #\d+ loaded/);
	await page.keyboard.press("Escape");

	// No key is pressed: the replay steers the hook itself.
	await page.getByRole("button", { name: "Cast Line" }).click();
	await watchUntil(page, "ended");
	await page.getByRole("button", { name: "DEBUG" }).click();
	await page.getByRole("button", { name: "Save run" }).click();
	await expect(page.getByTestId("save-status")).toHaveText(/sardine \(shallow\).* already in the library/);
});
