// Mock Game Server entry point. A real HTTP service (§16) — run with
// `pnpm dev:server`. Node strips the TypeScript types natively (Node 22.6+).

import { createServer } from "node:http";

import { config } from "./config.ts";
import { handle, route } from "./http.ts";

// Route modules self-register on import.
import "./routes/operator.ts";
import "./routes/session.ts";
import "./routes/game.ts";
import "./routes/docs.ts";

route("GET", "/api/health", () => ({ status: "ok", uptime: process.uptime() }));

createServer(handle).listen(config.port, () => {
	console.log(`Mock Game Server listening on http://127.0.0.1:${config.port}`);
});
