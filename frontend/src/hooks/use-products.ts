"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { productsApi } from "@/lib/api/products";
import type {
  CreateProductRequest,
  UpdateProductRequest,
  CreateProductCategoryRequest,
  UpdateProductCategoryRequest,
} from "@/lib/types/products";

// ─── Products ─────────────────────────────────────────────────────────────────

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: () => productsApi.list(),
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProductRequest) => productsApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); toast.success("Product created"); },
    onError: (err: Error) => toast.error(err.message || "Failed to create product"),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateProductRequest & { id: string }) =>
      productsApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); toast.success("Product updated"); },
    onError: (err: Error) => toast.error(err.message || "Failed to update product"),
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); toast.success("Product deleted"); },
    onError: (err: Error) => toast.error(err.message || "Failed to delete product"),
  });
}

export function useContactProducts(contactId: string | null) {
  return useQuery({
    queryKey: ["contact-products", contactId],
    queryFn: () => productsApi.getContactProducts(contactId!),
    enabled: !!contactId,
  });
}

export function useAssignProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ contactId, productId }: { contactId: string; productId: string }) =>
      productsApi.assign(contactId, productId),
    onSuccess: (_, { contactId }) => {
      qc.invalidateQueries({ queryKey: ["contact-products", contactId] });
    },
  });
}

export function useUnassignProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ contactId, productId }: { contactId: string; productId: string }) =>
      productsApi.unassign(contactId, productId),
    onSuccess: (_, { contactId }) => {
      qc.invalidateQueries({ queryKey: ["contact-products", contactId] });
    },
  });
}

// ─── Product Categories ────────────────────────────────────────────────────────

export function useProductCategories() {
  return useQuery({
    queryKey: ["product-categories"],
    queryFn: () => productsApi.listCategories(),
  });
}

export function useCreateProductCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProductCategoryRequest) => productsApi.createCategory(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["product-categories"] }); toast.success("Category created"); },
    onError: (err: Error) => toast.error(err.message || "Failed to create category"),
  });
}

export function useUpdateProductCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateProductCategoryRequest & { id: string }) =>
      productsApi.updateCategory(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["product-categories"] }); toast.success("Category updated"); },
    onError: (err: Error) => toast.error(err.message || "Failed to update category"),
  });
}

export function useDeleteProductCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productsApi.deleteCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-categories"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Category deleted");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to delete category"),
  });
}
