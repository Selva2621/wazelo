"use client";

import { useOrgSettings } from "@/hooks/use-settings";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Freelancers sell services, not products. The catalogue is the same feature underneath;
 * only the words on screen change. Business orgs keep "Products".
 */
export interface ProductTerms {
  /** True for FREELANCER orgs, where the catalogue reads as "Services" */
  isService: boolean;
  /** "product" | "service" */
  singular: string;
  /** "products" | "services" */
  plural: string;
  /** "Product" | "Service" */
  Singular: string;
  /** "Products" | "Services" */
  Plural: string;
}

const PRODUCT_TERMS: ProductTerms = {
  isService: false,
  singular: "product",
  plural: "products",
  Singular: "Product",
  Plural: "Products",
};

const SERVICE_TERMS: ProductTerms = {
  isService: true,
  singular: "service",
  plural: "services",
  Singular: "Service",
  Plural: "Services",
};

/** Words for the catalogue, for code that already knows whether the org is a freelancer. */
export function getProductTerms(isFreelancer: boolean): ProductTerms {
  return isFreelancer ? SERVICE_TERMS : PRODUCT_TERMS;
}

/** Words for the catalogue in the current org: "service" for freelancers, "product" otherwise. */
export function useProductTerms(): ProductTerms {
  const { data: orgSettings } = useOrgSettings();
  const userOrgType = useAuthStore((s) => s.user?.orgType);
  const orgType = orgSettings?.orgType ?? userOrgType;
  return getProductTerms(orgType === "FREELANCER");
}
