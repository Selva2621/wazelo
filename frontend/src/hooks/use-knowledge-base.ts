import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listCategories, createCategory, deleteCategory,
  listArticles, getArticle, createArticle, updateArticle, deleteArticle,
  listDocuments, uploadDocument, deleteDocument,
  listWebsiteSources, addWebsiteSource, resyncWebsiteSource, removeWebsiteSource,
  listFaqs, suggestFaqs, publishFaqs,
  setWebsiteAutoResync, listUnanswered, answerUnanswered, dismissUnanswered,
} from "@/lib/api/knowledge-base";

export function useSetWebsiteAutoResync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, autoResync }: { id: string; autoResync: boolean }) => setWebsiteAutoResync(id, autoResync),
    onSuccess: () => qc.invalidateQueries({ queryKey: websitesKey }),
  });
}

const unansweredKey = ["kb", "unanswered"] as const;

export function useKbUnanswered() {
  return useQuery({ queryKey: unansweredKey, queryFn: listUnanswered, refetchInterval: 60_000 });
}

export function useAnswerUnanswered() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...item }: { id: string; question: string; answer: string }) => answerUnanswered(id, item),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kb"] }),
  });
}

export function useDismissUnanswered() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: dismissUnanswered,
    onSuccess: () => qc.invalidateQueries({ queryKey: unansweredKey }),
  });
}

const faqsKey = ["kb", "faqs"] as const;

export function useKbFaqs() {
  return useQuery({ queryKey: faqsKey, queryFn: listFaqs });
}

/** AI suggestions only; nothing is saved until published. */
export function useSuggestFaqs() {
  return useMutation({ mutationFn: suggestFaqs });
}

export function usePublishFaqs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: publishFaqs,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kb"] }),
  });
}

const websitesKey = ["kb", "sources"] as const;

/** Websites the bot learns from; polled every 3s while one is being read. */
export function useKbWebsites() {
  return useQuery({
    queryKey: websitesKey,
    queryFn: listWebsiteSources,
    refetchInterval: (query) =>
      query.state.data?.some((s) => s.status === "QUEUED" || s.status === "CRAWLING") ? 3000 : false,
  });
}

export function useAddWebsite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: addWebsiteSource,
    onSuccess: () => qc.invalidateQueries({ queryKey: websitesKey }),
  });
}

export function useResyncWebsite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: resyncWebsiteSource,
    onSuccess: () => qc.invalidateQueries({ queryKey: websitesKey }),
  });
}

export function useRemoveWebsite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: removeWebsiteSource,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kb"] }),
  });
}

export function useKbCategories() {
  return useQuery({ queryKey: ["kb", "categories"], queryFn: listCategories });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: { name: string; slug: string; description?: string }) => createCategory(req),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kb", "categories"] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kb"] }),
  });
}

export function useKbArticles(params?: { categoryId?: string; isPublished?: boolean; search?: string; take?: number; skip?: number }) {
  return useQuery({ queryKey: ["kb", "articles", params], queryFn: () => listArticles(params) });
}

export function useKbArticle(id: string | undefined) {
  return useQuery({ queryKey: ["kb", "articles", id], queryFn: () => getArticle(id!), enabled: !!id });
}

export function useCreateArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: Parameters<typeof createArticle>[0]) => createArticle(req),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kb"] }),
  });
}

export function useUpdateArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...req }: { id: string } & Parameters<typeof updateArticle>[1]) => updateArticle(id, req),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kb"] }),
  });
}

export function useDeleteArticle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteArticle(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kb"] }),
  });
}

// Documents
export function useKbDocuments(flowId?: string) {
  return useQuery({
    queryKey: ["kb", "documents", flowId],
    queryFn: () => listDocuments(flowId),
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, title, flowId }: { file: File; title?: string; flowId?: string }) =>
      uploadDocument(file, title, flowId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kb", "documents"] }),
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDocument(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["kb", "documents"] }),
  });
}
