import { expect, it } from "vitest";

import { formatMoney } from "./formatMoney";

it("formats cents as currency", () => {
	expect(formatMoney(1050, "USD")).toBe("$10.50");
	expect(formatMoney(10, "USD")).toBe("$0.10");
});
