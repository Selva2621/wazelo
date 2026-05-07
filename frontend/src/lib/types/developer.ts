export interface DeveloperDashboardStats {
  totalMessages: number;
  messagesSentThisMonth: number;
  messagesLimit: number;
  messagesUsed: number;
  totalContacts: number;
  activeWebhooks: number;
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

export interface DeveloperMessageLog {
  id: string;
  contactPhone: string;
  type: string;
  status: string;
  body?: string;
  createdAt: string;
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
