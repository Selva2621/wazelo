import apiClient, { API_BASE_URL, ApiError } from "./client";

export type ProposalStatus = "DRAFT" | "SENT" | "VIEWED" | "ACCEPTED" | "CHANGES_REQUESTED";

export interface ProposalItem {
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
}

export interface ProposalTotals {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
}

export interface Proposal {
  id: string;
  /** "P-0012" */
  number: string;
  title: string;
  intro: string | null;
  scope: string[];
  items: ProposalItem[];
  taxPercent: number;
  currency: string;
  totals: ProposalTotals;
  terms: string | null;
  validUntil: string | null;
  status: ProposalStatus;
  expired: boolean;
  publicUrl: string;
  sentAt: string | null;
  viewedAt: string | null;
  respondedAt: string | null;
  responseNote: string | null;
  acceptedBy: string | null;
  contact: { id: string; name: string | null; phoneNumber: string };
  deal: { id: string; title: string; status: string; pipelineId: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProposalListItem {
  id: string;
  number: string;
  title: string;
  status: ProposalStatus;
  total: number;
  currency: string;
  validUntil: string | null;
  sentAt: string | null;
  viewedAt: string | null;
  respondedAt: string | null;
  updatedAt: string;
  contact: { id: string; name: string | null; phoneNumber: string };
  deal: { id: string; title: string } | null;
}

export interface ProposalEdits {
  title?: string;
  intro?: string | null;
  scope?: string[];
  items?: ProposalItem[];
  taxPercent?: number;
  discount?: number;
  currency?: string;
  terms?: string | null;
  validUntil?: string | null;
}

export const proposalsApi = {
  create: (data: { contactId: string; dealId?: string }) => apiClient.post<Proposal>("/proposals", data).then((r) => r.data),
  list: (params?: { contactId?: string; dealId?: string; status?: ProposalStatus }) =>
    apiClient.get<ProposalListItem[]>("/proposals", { params }).then((r) => r.data),
  get: (id: string) => apiClient.get<Proposal>(`/proposals/${id}`).then((r) => r.data),
  update: (id: string, data: ProposalEdits) => apiClient.patch<Proposal>(`/proposals/${id}`, data).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/proposals/${id}`).then(() => undefined),
  /** AI reads the chat, deal and product list (≈20s) */
  draft: (id: string) => apiClient.post<Proposal>(`/proposals/${id}/draft`, undefined, { timeout: 90_000 }).then((r) => r.data),
  /** AI rewrite of one section's text (not saved; the editor autosaves it) */
  improve: (id: string, section: "intro" | "scope" | "terms", text: string) =>
    apiClient
      .post<{ text: string }>(`/proposals/${id}/improve`, { section, text }, { timeout: 60_000 })
      .then((r) => r.data),
  send: (id: string) => apiClient.post<Proposal>(`/proposals/${id}/send`).then((r) => r.data),
  /** The PDF as a file download (server-rendered, same look as the client page) */
  downloadPdf: async (id: string, fallbackName: string) => {
    const res = await apiClient.get<Blob>(`/proposals/${id}/pdf`, { responseType: "blob", timeout: 60_000 });
    const disposition = String(res.headers["content-disposition"] ?? "");
    const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1];
    const name = encoded ? decodeURIComponent(encoded) : fallbackName;
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  },
  /** Marks it sent so the link opens, for sharing it yourself */
  share: (id: string) => apiClient.post<Proposal>(`/proposals/${id}/share`).then((r) => r.data),
};

// ─── The client's page (/p/:token): no login, so plain fetch (apiClient would redirect to sign-in) ───

export interface PublicProposal {
  number: string;
  title: string;
  intro: string | null;
  scope: string[];
  items: ProposalItem[];
  taxPercent: number;
  currency: string;
  totals: ProposalTotals;
  terms: string | null;
  validUntil: string | null;
  issuedAt: string;
  status: Exclude<ProposalStatus, "DRAFT">;
  expired: boolean;
  respondedAt: string | null;
  acceptedBy: string | null;
  client: { name: string | null };
  business: { name: string; website: string | null };
}

async function publicCall<T>(token: string, path = "", body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}/public/proposals/${encodeURIComponent(token)}${path}`, {
    method: body ? "POST" : "GET",
    headers: { "x-requested-with": "XMLHttpRequest", ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const message = Array.isArray(json?.message) ? json.message[0] : json?.message;
    throw new ApiError(res.status, message || "Something went wrong. Please try again.", json?.errors, json?.error);
  }
  return (json && typeof json === "object" && "success" in json ? json.data : json) as T;
}

export const publicProposalApi = {
  get: (token: string) => publicCall<PublicProposal>(token),
  accept: (token: string, name: string) => publicCall<PublicProposal>(token, "/accept", { name }),
  requestChanges: (token: string, note: string) => publicCall<PublicProposal>(token, "/changes", { note }),
  /** Opens in the browser's PDF viewer (save / share from there) */
  pdfUrl: (token: string) => `${API_BASE_URL}/public/proposals/${encodeURIComponent(token)}/pdf`,
};
