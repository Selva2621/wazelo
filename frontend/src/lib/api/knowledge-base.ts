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
  /** UPLOAD (file) or WEBSITE (a crawled page) */
  sourceType?: "UPLOAD" | "WEBSITE" | "TEXT";
  sourceUrl?: string | null;
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

// Websites the bot learns from (crawled in the background)
export interface KbWebsiteSource {
  id: string;
  url: string;
  status: "QUEUED" | "CRAWLING" | "READY" | "FAILED";
  pagesFound: number;
  pagesDone: number;
  /** Pages currently stored */
  pages: number;
  error: string | null;
  lastSyncedAt: string | null;
  /** Re-read every week */
  autoResync: boolean;
  createdAt: string;
}

export async function setWebsiteAutoResync(id: string, autoResync: boolean): Promise<KbWebsiteSource> {
  const { data } = await apiClient.patch(`/kb/sources/${id}`, { autoResync });
  return data;
}

// Questions the bot couldn't answer (WhatsApp chatbot + website widget)
export interface KbUnanswered {
  id: string;
  question: string;
  count: number;
  channel: "WHATSAPP" | "WIDGET";
  lastAskedAt: string;
}

export async function listUnanswered(): Promise<{ items: KbUnanswered[]; total: number }> {
  const { data } = await apiClient.get("/kb/unanswered");
  return data;
}

/** Publishes the answer as a FAQ and clears the question. */
export async function answerUnanswered(id: string, item: { question: string; answer: string }): Promise<void> {
  await apiClient.post(`/kb/unanswered/${id}/answer`, item);
}

export async function dismissUnanswered(id: string): Promise<void> {
  await apiClient.delete(`/kb/unanswered/${id}`);
}

export async function listWebsiteSources(): Promise<KbWebsiteSource[]> {
  const { data } = await apiClient.get("/kb/sources");
  return data;
}

export async function addWebsiteSource(url: string): Promise<KbWebsiteSource> {
  const { data } = await apiClient.post("/kb/sources", { url });
  return data;
}

export async function resyncWebsiteSource(id: string): Promise<KbWebsiteSource> {
  const { data } = await apiClient.post(`/kb/sources/${id}/resync`);
  return data;
}

export async function removeWebsiteSource(id: string): Promise<void> {
  await apiClient.delete(`/kb/sources/${id}`);
}

// FAQs: AI suggests them from the website/files; published ones are articles tagged "faq"
export interface KbFaq {
  id: string;
  /** The question */
  title: string;
  /** The answer */
  body: string;
  isPublished: boolean;
  updatedAt: string;
}

export interface FaqSuggestion {
  question: string;
  answer: string;
}

export async function listFaqs(): Promise<KbFaq[]> {
  const { data } = await apiClient.get("/kb/faqs");
  return data;
}

export async function suggestFaqs(): Promise<{ suggestions: FaqSuggestion[] }> {
  // The AI reads the whole site here, which takes ~20s: past the client's default 15s
  const { data } = await apiClient.post("/kb/faqs/generate", undefined, { timeout: 90_000 });
  return data;
}

export async function publishFaqs(items: FaqSuggestion[]): Promise<{ published: number }> {
  const { data } = await apiClient.post("/kb/faqs", { items });
  return data;
}
