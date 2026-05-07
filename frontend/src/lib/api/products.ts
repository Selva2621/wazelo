import apiClient from "./client";
import type {
  Product,
  ProductCategory,
  CreateProductRequest,
  UpdateProductRequest,
  CreateProductCategoryRequest,
  UpdateProductCategoryRequest,
} from "@/lib/types/products";

export const productsApi = {
  // ─── Products ─────────────────────────────────────────────────────────────
  list: () =>
    apiClient.get<Product[]>("/products").then((r) => r.data),

  create: (data: CreateProductRequest) =>
    apiClient.post<Product>("/products", data).then((r) => r.data),

  update: (id: string, data: UpdateProductRequest) =>
    apiClient.patch<Product>(`/products/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/products/${id}`).then((r) => r.data),

  assign: (contactId: string, productId: string) =>
    apiClient.post("/products/assign", { contactId, productId }).then((r) => r.data),

  unassign: (contactId: string, productId: string) =>
    apiClient.delete("/products/unassign", { data: { contactId, productId } }).then((r) => r.data),

  getContactProducts: (contactId: string) =>
    apiClient.get<Product[]>(`/products/by-contact/${contactId}`).then((r) => r.data),

  // ─── Categories ──────────────────────────────────────────────────────────
  listCategories: () =>
    apiClient.get<ProductCategory[]>("/products/categories").then((r) => r.data),

  createCategory: (data: CreateProductCategoryRequest) =>
    apiClient.post<ProductCategory>("/products/categories", data).then((r) => r.data),

  updateCategory: (id: string, data: UpdateProductCategoryRequest) =>
    apiClient.patch<ProductCategory>(`/products/categories/${id}`, data).then((r) => r.data),

  deleteCategory: (id: string) =>
    apiClient.delete(`/products/categories/${id}`).then((r) => r.data),
};
