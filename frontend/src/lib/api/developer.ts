import apiClient from "./client";
import type {
  DeveloperDashboardStats,
  DeveloperApiKey,
  DeveloperMessageLog,
  PaginatedResponse,
  CreateApiKeyRequest,
} from "@/lib/types/developer";

// ── Dashboard Stats ──

export async function getDeveloperDashboard(): Promise<DeveloperDashboardStats> {
  const { data } = await apiClient.get("/developer/portal/dashboard");
  return data;
}

// ── API Logs ──

export async function getDeveloperLogs(
  limit = 20,
  cursor?: string,
): Promise<PaginatedResponse<DeveloperMessageLog>> {
  const params: Record<string, string> = { limit: String(limit) };
  if (cursor) params.cursor = cursor;
  const { data } = await apiClient.get("/developer/portal/logs", { params });
  return data;
}

// ── API Keys (reuses existing /api-keys endpoints) ──

export async function listApiKeys(): Promise<DeveloperApiKey[]> {
  const { data } = await apiClient.get("/api-keys");
  return data;
}

export async function createApiKey(req: CreateApiKeyRequest): Promise<DeveloperApiKey> {
  const { data } = await apiClient.post("/api-keys", req);
  return data;
}

export async function revokeApiKey(id: string): Promise<void> {
  await apiClient.delete(`/api-keys/${id}`);
}

export async function rotateApiKey(id: string): Promise<DeveloperApiKey> {
  const { data } = await apiClient.post(`/api-keys/${id}/rotate`);
  return data;
}
