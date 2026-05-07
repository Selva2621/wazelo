import apiClient from "./client";

export interface KbCategory {
  id: string;
  orgId: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  _count: { articles: number };
}

export interface KbArticle {
  id: string;
  orgId: string;
  categoryId: string | null;
  title: string;
  slug: string;
  body: string;
  isPublished: boolean;
  isInternal: boolean;
  authorId: string;
  viewCount: number;
  helpfulCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  category: { id: string; name: string } | null;
  author: { id: string; firstName: string; lastName: string };
}

export interface ArticleListResponse {
  data: KbArticle[];
  total: number;
}

// Categories
export async function listCategories(): Promise<KbCategory[]> {
  const { data } = await apiClient.get("/kb/categories");
  return data;
}

export async function createCategory(req: { name: string; slug: string; description?: string }): Promise<KbCategory> {
  const { data } = await apiClient.post("/kb/categories", req);
  return data;
}

export async function deleteCategory(id: string): Promise<void> {
  await apiClient.delete(`/kb/categories/${id}`);
}

// Articles
export async function listArticles(params?: {
  categoryId?: string;
  isPublished?: boolean;
  search?: string;
  take?: number;
  skip?: number;
}): Promise<ArticleListResponse> {
  const { data } = await apiClient.get("/kb/articles", { params });
  return data;
}

export async function getArticle(id: string): Promise<KbArticle> {
  const { data } = await apiClient.get(`/kb/articles/${id}`);
  return data;
}

export async function createArticle(req: {
  title: string;
  slug: string;
  body: string;
  categoryId?: string;
  isPublished?: boolean;
  isInternal?: boolean;
  tags?: string[];
}): Promise<KbArticle> {
  const { data } = await apiClient.post("/kb/articles", req);
  return data;
}

export async function updateArticle(id: string, req: Partial<{
  title: string;
  slug: string;
  body: string;
  categoryId: string | null;
  isPublished: boolean;
  isInternal: boolean;
  tags: string[];
}>): Promise<KbArticle> {
  const { data } = await apiClient.patch(`/kb/articles/${id}`, req);
  return data;
}

export async function deleteArticle(id: string): Promise<void> {
  await apiClient.delete(`/kb/articles/${id}`);
}

// Documents
export interface KbDocument {
  id: string;
  title: string;
  filename: string;
  contentType: string;
  fileSize: number;
  status: "PROCESSING" | "READY" | "FAILED";
  flowId: string | null;
  createdAt: string;
  uploadedBy: { id: string; firstName: string; lastName: string };
}

export async function listDocuments(flowId?: string): Promise<KbDocument[]> {
  const params: Record<string, string> = {};
  if (flowId) params.flowId = flowId;
  const { data } = await apiClient.get("/kb/documents", { params });
  return data;
}

export async function uploadDocument(file: File, title?: string, flowId?: string): Promise<KbDocument> {
  const formData = new FormData();
  formData.append("file", file);
  if (title) formData.append("title", title);
  if (flowId) formData.append("flowId", flowId);
  const { data } = await apiClient.post("/kb/documents/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function deleteDocument(id: string): Promise<void> {
  await apiClient.delete(`/kb/documents/${id}`);
}
