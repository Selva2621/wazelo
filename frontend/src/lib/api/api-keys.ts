import apiClient from "./client";

export interface ApiKeyRecord {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  isActive: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
  createdBy: { id: string; firstName: string; lastName: string };
}

export interface CreateApiKeyResponse extends ApiKeyRecord {
  rawKey: string;
}

export async function createApiKey(req: {
  name: string; scopes: string[]; expiresInDays?: number;
}): Promise<CreateApiKeyResponse> {
  const { data } = await apiClient.post("/api-keys", req);
  return data;
}

export async function listApiKeys(): Promise<ApiKeyRecord[]> {
  const { data } = await apiClient.get("/api-keys");
  return data;
}

export async function revokeApiKey(id: string): Promise<void> {
  await apiClient.delete(`/api-keys/${id}`);
}

export async function rotateApiKey(id: string): Promise<CreateApiKeyResponse> {
  const { data } = await apiClient.post(`/api-keys/${id}/rotate`);
  return data;
}
