// Decimal-string money helpers (BUILD_PLAN dev principles: money is always a
// decimal string, never a float). Integer cents internally so the balance/
// wager/payout path never touches floating point.

const DECIMAL = /^\d+(\.\d{1,2})?$/;

/** Parses a decimal-string amount into integer cents. NaN if malformed. */
export function toCents(amount: string): number {
	if (!DECIMAL.test(amount)) return NaN;
	const [whole, frac = ""] = amount.split(".");
	return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}

/** Formats integer cents back into a 2-decimal-place decimal string. */
export function fromCents(cents: number): string {
	const sign = cents < 0 ? "-" : "";
	const abs = Math.abs(Math.round(cents));
	return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}
