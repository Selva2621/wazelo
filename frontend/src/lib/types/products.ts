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
  /** Older backends omit the brand and lead fields */
  brandId?: string | null;
  brand?: Brand | null;
  /** People who handle this product's leads (round-robin) */
  leadHandlerIds?: string[];
  /** Remind the lead's owner after this many minutes without contact */
  leadReminderMinutes?: number;
  createdAt: string;
  updatedAt: string;
}

/** Groups products, e.g. one builder with several projects */
export interface Brand {
  id: string;
  name: string;
  /** Gets the brand's end-of-day lead summary */
  managerId: string | null;
  /** Default WhatsApp number for the brand */
  sessionId: string | null;
  sortOrder: number;
}

export interface BrandRequest {
  name?: string;
  managerId?: string | null;
  sessionId?: string | null;
}

export interface CreateProductRequest {
  name: string;
  description?: string;
  price?: number;
  currency?: string;
  sku?: string;
  imageUrl?: string;
  categoryId?: string;
  brandId?: string;
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
  brandId?: string | null;
  leadHandlerIds?: string[];
  leadReminderMinutes?: number;
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
