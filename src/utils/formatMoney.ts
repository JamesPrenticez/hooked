/** Integer minor units (cents) as a localised currency string. Bets are held
 *  in cents so summing them never touches float arithmetic (Rule 6b). */
export function formatMoney(cents: number, currency: string): string {
	return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}
