export interface DeveloperDashboardStats {
  totalMessages: number;
  /** Messages sent in the current billing period */
  messagesUsed: number;
  /** null when the plan has no message cap */
  messagesLimit: number | null;
  totalContacts: number;
  activeSessions: number;
  activeApiKeys: number;
}

export interface DeveloperApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  rawKey?: string;
  scopes: string[];
  isActive: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
  createdBy?: { id: string; firstName: string; lastName: string };
}

/** One Developer API request, from Settings → API Logs. */
export interface DeveloperApiRequestLog {
  id: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  errorMessage: string | null;
  ipAddress: string | null;
  createdAt: string;
  apiKeyName: string | null;
  apiKeyPrefix: string | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface CreateApiKeyRequest {
  name: string;
  scopes: string[];
  expiresInDays?: number;
}
