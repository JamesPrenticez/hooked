/** Base URL of the game server. Override with VITE_API_BASE_URL. */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:4201";

/**
 * Whether the /api/debug/* dev controls are available (ARCHITECTURE.md §8).
 * Set VITE_DEBUG=true in dev; unset for production builds so the debug API
 * helpers refuse to run and any debug UI stays unmounted.
 */
export const DEBUG = import.meta.env.VITE_DEBUG === "true";
