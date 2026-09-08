import { create } from "zustand";

// The server-authoritative player balance, mirrored for display (ARCHITECTURE
// §14). Every value here came verbatim from a server response — POST
// /api/game/current on boot, GET /api/game/balance, or a settled round. There
// is deliberately no "adjust by delta" action: the client never computes the
// authoritative balance (Rule 3), it only replaces this with what the server
// last reported.
interface BalanceStore {
	/** Decimal string ("1000.00"), or null before the first server figure. */
	balance: string | null;
	/** ISO currency code from the session, or null before it's known. */
	currency: string | null;
	setBalance: (balance: string, currency: string) => void;
}

export const useBalanceStore = create<BalanceStore>(set => ({
	balance: null,
	currency: null,
	setBalance: (balance, currency) => set({ balance, currency })
}));
