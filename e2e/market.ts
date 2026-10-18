import { expect, type Page } from "@playwright/test";

const API = process.env.VITE_API_BASE_URL ?? "http://127.0.0.1:4201";

/** The pop-up that deals a round's fish market onto the dock board before the hook goes down. */
export const marketDialog = (page: Page) => page.getByRole("dialog", { name: "New fish market prices" });

/** The fish market board on the dock. */
export const marketBoard = (page: Page) => page.getByRole("region", { name: "Fish market" });

/** Casts the line and taps through the fish market pop-up, so the hook is on its way down. */
export async function cast(page: Page) {
	await page.getByRole("button", { name: "Cast Line" }).click();
	await expect(marketDialog(page)).toBeVisible();
	await marketDialog(page).click();
	await expect(marketDialog(page)).not.toBeVisible();
}

/** Pins the next round's catch on the mock server (no fish clears it). The server's debug state is shared, so a test
 *  that pins a fish must clear it again. */
export async function forceCatch(page: Page, fish?: string) {
	const res = await page.request.post(`${API}/api/debug/force-outcome`, { data: fish ? { fish } : {} });
	expect(res.ok()).toBe(true);
}

/** Closes the debug dialog. It no longer closes on Escape, so this clicks its Close button. */
export async function closeDebug(page: Page) {
	await page.getByRole("button", { name: "Close", exact: true }).last().click();
}
