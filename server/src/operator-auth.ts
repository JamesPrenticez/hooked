// HMAC-SHA256 signing for the operator launch handshake (§35). The same helper
// signs the outbound request and verifies it on the receiving end — in the mock
// server both sides are local, but the crypto path is real.

import { createHmac, timingSafeEqual } from "node:crypto";

import { config } from "./config.ts";

export interface OperatorHeaders {
	[header: string]: string;
	"x-operator-id": string;
	"x-timestamp": string;
	"x-hmac-sha256": string;
}

function sign(body: string, timestamp: string): string {
	return createHmac("sha256", config.operatorSecret).update(`${timestamp}.${body}`).digest("hex");
}

export function signHeaders(body: string): OperatorHeaders {
	const timestamp = Date.now().toString();
	return {
		"x-operator-id": config.operatorId,
		"x-timestamp": timestamp,
		"x-hmac-sha256": sign(body, timestamp)
	};
}

/** Returns true when the headers authenticate the given raw body. */
export function verifyHeaders(headers: Record<string, string | string[] | undefined>, body: string): boolean {
	const id = headers["x-operator-id"];
	const timestamp = headers["x-timestamp"];
	const mac = headers["x-hmac-sha256"];
	if (typeof id !== "string" || typeof timestamp !== "string" || typeof mac !== "string") return false;
	if (id !== config.operatorId) return false;
	const expected = sign(body, timestamp);
	if (expected.length !== mac.length) return false;
	return timingSafeEqual(Buffer.from(expected), Buffer.from(mac));
}
