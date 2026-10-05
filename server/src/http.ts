// Minimal HTTP plumbing over Node's stdlib http server: a method+path router,
// JSON body parsing, structured error responses and dev request logging.
// No framework — the mock server's surface is small and fixed (§5).

import type { IncomingMessage, ServerResponse } from "node:http";

import { config } from "./config.ts";
import { getSimulation } from "./debug-state.ts";

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export interface Ctx {
	req: IncomingMessage;
	res: ServerResponse;
	/** Parsed JSON request body, or {} for GET / empty bodies. */
	body: unknown;
	/** Path params captured from the route pattern (e.g. "/round/:id"). */
	params: Record<string, string>;
}

export type Handler = (ctx: Ctx) => Promise<unknown> | unknown;

/** Thrown by handlers to return a non-2xx with a structured error body (§5). */
export class HttpError extends Error {
	status: number;
	code: string;
	constructor(status: number, code: string, message: string) {
		super(message);
		this.status = status;
		this.code = code;
	}
}

interface Route {
	method: string;
	segments: string[];
	handler: Handler;
}

const routes: Route[] = [];

export function route(method: string, pattern: string, handler: Handler) {
	routes.push({
		method,
		segments: pattern.split("/").filter(Boolean),
		handler
	});
}

function match(route: Route, method: string, path: string): Record<string, string> | null {
	if (route.method !== method) return null;
	const parts = path.split("/").filter(Boolean);
	if (parts.length !== route.segments.length) return null;
	const params: Record<string, string> = {};
	for (let i = 0; i < parts.length; i++) {
		const seg = route.segments[i];
		if (seg.startsWith(":")) params[seg.slice(1)] = decodeURIComponent(parts[i]);
		else if (seg !== parts[i]) return null;
	}
	return params;
}

async function readJson(req: IncomingMessage): Promise<unknown> {
	const chunks: Buffer[] = [];
	for await (const chunk of req) chunks.push(chunk as Buffer);
	if (chunks.length === 0) return {};
	try {
		return JSON.parse(Buffer.concat(chunks).toString("utf8"));
	} catch {
		throw new HttpError(400, "invalid_json", "Request body is not valid JSON");
	}
}

function send(res: ServerResponse, status: number, payload: unknown) {
	const json = JSON.stringify(payload);
	res.writeHead(status, { "content-type": "application/json" });
	res.end(json);
}

export async function handle(req: IncomingMessage, res: ServerResponse) {
	const method = req.method ?? "GET";
	const path = (req.url ?? "/").split("?")[0];
	const start = Date.now();

	// The client is served by Vite on another origin, so a browser can only reach this dev server with CORS.
	// Auth is a bearer header, not a cookie, so any origin is fine. Off in production, like the debug routes.
	if (config.debugControls) {
		res.setHeader("access-control-allow-origin", "*");
		if (method === "OPTIONS") {
			res.writeHead(204, {
				"access-control-allow-methods": "GET, POST, OPTIONS",
				"access-control-allow-headers": "authorization, content-type"
			});
			res.end();
			return;
		}
	}

	try {
		let matched: { handler: Handler; params: Record<string, string> } | undefined;
		for (const r of routes) {
			const params = match(r, method, path);
			if (params) {
				matched = { handler: r.handler, params };
				break;
			}
		}
		if (!matched) throw new HttpError(404, "not_found", `No route for ${method} ${path}`);

		// Simulated latency/errors (§16). Debug routes themselves are exempt, so
		// the controls stay reachable while an error rate is armed.
		if (config.debugControls && !path.startsWith("/api/debug/")) {
			const sim = getSimulation();
			if (sim.latencyMs > 0) await delay(sim.latencyMs);
			if (sim.errorRate > 0 && Math.random() < sim.errorRate) {
				throw new HttpError(500, "simulated_error", "Simulated server error (debug)");
			}
		}

		const body = method === "GET" || method === "HEAD" ? {} : await readJson(req);
		const result = await matched.handler({
			req,
			res,
			body,
			params: matched.params
		});
		// A handler that wrote to `res` itself (e.g. the docs pages) owns the response.
		if (!res.writableEnded) send(res, 200, result);
		if (config.logRequests) console.log(`${method} ${path} ${res.statusCode} ${Date.now() - start}ms`);
	} catch (err) {
		const e =
			err instanceof HttpError
				? err
				: new HttpError(500, "server_error", err instanceof Error ? err.message : "Unknown error");
		send(res, e.status, { error: { code: e.code, message: e.message } });
		if (config.logRequests) console.log(`${method} ${path} ${e.status} ${Date.now() - start}ms — ${e.code}`);
	}
}
