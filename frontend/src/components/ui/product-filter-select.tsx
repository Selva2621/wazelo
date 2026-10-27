"use client";

import { useProducts } from "@/hooks/use-products";
import { FilterSelect } from "@/components/ui/filter-bar";

interface ProductFilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/** Product filter in the shared filter-bar style. Hidden when the org has no products. */
export function ProductFilterSelect({ value, onChange, className }: ProductFilterSelectProps) {
  const { data: products } = useProducts();

  if (!products || products.length === 0) return null;

  return (
    <FilterSelect label="Product" active={!!value} value={value} onChange={(e) => onChange(e.target.value)} className={className}>
      <option value="">All products</option>
      {products
        .filter((p) => p.status === "ACTIVE")
        .map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
    </FilterSelect>
  );
}
