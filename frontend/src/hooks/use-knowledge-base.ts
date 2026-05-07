import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listCategories, createCategory, deleteCategory,
  listArticles, getArticle, createArticle, updateArticle, deleteArticle,
  listDocuments, uploadDocument, deleteDocument,
} from "@/lib/api/knowledge-base";

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
