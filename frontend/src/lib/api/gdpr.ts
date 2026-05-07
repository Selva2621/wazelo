import apiClient from "./client";

export interface ConsentRecord {
  id: string;
  contactId: string;
  consentType: string;
  granted: boolean;
  source: string;
  grantedAt: string;
  revokedAt: string | null;
}

export interface DataRequest {
  id: string;
  contactId: string;
  requestType: "export" | "erasure";
  status: string;
  completedAt: string | null;
  createdAt: string;
  contact: { id: string; name: string | null; phoneNumber: string; email: string | null };
}

export async function getConsents(contactId: string): Promise<ConsentRecord[]> {
  const { data } = await apiClient.get(`/gdpr/contacts/${contactId}/consents`);
  return data;
}

export async function recordConsent(contactId: string, req: {
  consentType: string;
  granted: boolean;
  source: string;
}): Promise<ConsentRecord> {
  const { data } = await apiClient.post(`/gdpr/contacts/${contactId}/consent`, req);
  return data;
}

export async function exportContactData(contactId: string): Promise<Record<string, unknown>> {
  const { data } = await apiClient.post(`/gdpr/contacts/${contactId}/export`);
  return data;
}

export async function eraseContactData(contactId: string, reason?: string): Promise<{ erased: boolean }> {
  const { data } = await apiClient.post(`/gdpr/contacts/${contactId}/erase`, { reason });
  return data;
}

export async function listDataRequests(take = 50, skip = 0): Promise<{ data: DataRequest[]; total: number }> {
  const { data } = await apiClient.get("/gdpr/requests", { params: { take, skip } });
  return data;
}
