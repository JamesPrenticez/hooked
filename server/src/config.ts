// Mock Game Server configuration. Env-driven with dev-safe defaults so the
// server runs with zero setup; production wiring replaces these later (§34).

const num = (v: string | undefined, fallback: number) => (v ? Number(v) : fallback);

export const config = {
	port: num(process.env.SERVER_PORT, 3001),
	// The operator handshake the server performs against its own /operator/launch
	// endpoint (§35). Secret is server-side only and never reaches the browser.
	operatorId: process.env.OPERATOR_ID ?? "dev-operator",
	operatorSecret: process.env.OPERATOR_SECRET ?? "dev-operator-secret",
	// Development wallet — assigned on session creation, reset on server start.
	currency: process.env.DEV_CURRENCY ?? "USD",
	startingBalance: process.env.DEV_BALANCE ?? "1000.00",
	// Chatty request logging in dev; off in production.
	logRequests: process.env.NODE_ENV !== "production",
	// /api/debug/* controls (forced outcomes, resets, latency/error injection).
	// Never registered in production — the routes simply don't exist there.
	debugControls: process.env.NODE_ENV !== "production"
};
