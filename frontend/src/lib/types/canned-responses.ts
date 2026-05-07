export interface CannedResponse {
  id: string;
  orgId: string;
  title: string;
  content: string;
  shortcut: string | null;
  category: string | null;
  createdById: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCannedResponseRequest {
  title: string;
  content: string;
  shortcut?: string;
  category?: string;
}

export interface UpdateCannedResponseRequest {
  title?: string;
  content?: string;
  shortcut?: string;
  category?: string;
}
