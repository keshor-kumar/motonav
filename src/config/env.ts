// ============================================================
// Centralized runtime configuration. Never hardcode API keys,
// service URLs, or localhost anywhere else in the app — read them
// from here. Keys come from import.meta.env (Vite env vars), never
// from source code, and are never logged or rendered in the UI.
// ============================================================

export const APP_NAME = import.meta.env.VITE_APP_NAME || "MotoNav";

export const GEOAPIFY_API_KEY = import.meta.env.VITE_GEOAPIFY_API_KEY || "";
export const MAPTILER_API_KEY = import.meta.env.VITE_MAPTILER_API_KEY || "";

export const GEOAPIFY_BASE_URL = "https://api.geoapify.com";
export const MAPTILER_BASE_URL = "https://api.maptiler.com";

/** True once both required keys are present — services/components check this
 *  and show a clear "missing API key" message instead of failing silently. */
export const hasGeoapifyKey = Boolean(GEOAPIFY_API_KEY);
export const hasMapTilerKey = Boolean(MAPTILER_API_KEY);

/** MapTiler's hosted dark "streets" style, pre-wired with the API key. */
export function getMapTilerStyleUrl(): string {
  return `${MAPTILER_BASE_URL}/maps/streets-v2-dark/style.json?key=${MAPTILER_API_KEY}`;
}

// ---------- Stage 3: group rides backend + public share URL ----------

/** Backend base URL (REST + Socket.IO). Set VITE_API_BASE_URL in production.
 *  In dev only, falls back to the local backend so `npm run dev` just works. */
export const API_BASE_URL: string = (
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? "http://localhost:4000" : "")
).replace(/\/$/, "");

/** Public origin used to build shareable ride links (e.g. https://motonav.vercel.app).
 *  Falls back to the browser's current origin so dev/preview links still work;
 *  set VITE_PUBLIC_APP_URL explicitly in production so links are never wrong. */
export const PUBLIC_APP_URL: string = (
  import.meta.env.VITE_PUBLIC_APP_URL || (typeof window !== "undefined" ? window.location.origin : "")
).replace(/\/$/, "");

export const hasApiBaseUrl = Boolean(API_BASE_URL);

/** Socket.IO connects here. Almost always the same host as API_BASE_URL
 *  (the MotoNav backend serves REST + Socket.IO from one process) — only
 *  set VITE_SOCKET_URL separately if yours genuinely differ. */
export const SOCKET_URL: string = (import.meta.env.VITE_SOCKET_URL || API_BASE_URL).replace(/\/$/, "");

export function buildJoinUrl(rideCode: string): string {
  return `${PUBLIC_APP_URL}/join/${rideCode}`;
}
