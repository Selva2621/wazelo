export type ProductStatus = "ACTIVE" | "INACTIVE";

export interface ProductCategory {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  color: string | null;
  sortOrder: number;
  isActive: boolean;
  parentId: string | null;
  parent: ProductCategory | null;
  children: ProductCategory[];
  createdAt: string;
}

export interface Product {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  price: string | null;       // Decimal comes as string from Prisma/JSON
  currency: string | null;
  sku: string | null;
  imageUrl: string | null;
  categoryId: string | null;
  category: ProductCategory | null;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductRequest {
  name: string;
  description?: string;
  price?: number;
  currency?: string;
  sku?: string;
  imageUrl?: string;
  categoryId?: string;
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  sku?: string;
  imageUrl?: string;
  categoryId?: string;
  status?: ProductStatus;
}

export interface CreateProductCategoryRequest {
  name: string;
  description?: string;
  color?: string;
  sortOrder?: number;
  parentId?: string;
}

export interface UpdateProductCategoryRequest {
  name?: string;
  description?: string;
  color?: string;
  sortOrder?: number;
  parentId?: string;
  isActive?: boolean;
}
