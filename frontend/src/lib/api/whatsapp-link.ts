import { API_BASE_URL, ApiError } from "./client";

/**
 * Login-free "reconnect WhatsApp from your phone" endpoints (link in disconnect
 * emails). Plain fetch on purpose: the shared apiClient refreshes sessions and
 * redirects to login, neither of which applies to a token-only page.
 */

export type WhatsAppLinkState =
  | "connected"
  | "reconnecting"
  | "reconnectable"
  | "pairing"
  | "needs_pairing"
  | "blocked";

export interface WhatsAppLinkStatus {
  state: WhatsAppLinkState;
  /** Masked, e.g. +91 ••••• 3210 */
  phoneNumber: string | null;
  pairingCode: string | null;
}

async function call<T>(token: string, path = "", method: "GET" | "POST" = "GET"): Promise<T> {
  const res = await fetch(
    `${API_BASE_URL}/whatsapp/link/${encodeURIComponent(token)}${path}`,
    { method, headers: { "x-requested-with": "XMLHttpRequest" } },
  );
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = Array.isArray(body?.message) ? body.message[0] : body?.message;
    throw new ApiError(res.status, message || "Something went wrong. Please try again.", body?.errors, body?.error);
  }
  return (body && typeof body === "object" && "success" in body ? body.data : body) as T;
}

export const whatsappLinkApi = {
  getStatus: (token: string) => call<WhatsAppLinkStatus>(token),
  reconnect: (token: string) =>
    call<{ state: WhatsAppLinkState }>(token, "/reconnect", "POST"),
  requestPairingCode: (token: string) =>
    call<{ state: WhatsAppLinkState; pairingCode: string }>(token, "/pairing-code", "POST"),
};
