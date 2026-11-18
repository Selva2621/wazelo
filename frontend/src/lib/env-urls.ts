/**
 * Backend URLs for the browser. NEXT_PUBLIC_* values are baked in at build time.
 *
 * Development falls back to the local backend on :8080. A production build never falls
 * back to localhost: without the env vars it uses this site's own origin (API proxied
 * at /api/v1 via BACKEND_URL rewrites, sockets proxied at /socket.io by Nginx).
 */
const isProd = process.env.NODE_ENV === "production";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || (isProd ? "/api/v1" : "http://localhost:8080/api/v1");

function wsFromApi(): string {
  // An absolute API URL lives on the backend's origin, so its sockets do too
  const m = /^(https?:\/\/[^/]+)/i.exec(API_BASE_URL);
  return m ? `${m[1]}/ws` : "/ws";
}

/** Socket.IO URL: backend origin + the "/ws" namespace */
export const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL || (isProd ? wsFromApi() : "http://localhost:8080/ws");
