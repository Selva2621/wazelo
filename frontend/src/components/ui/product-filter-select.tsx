"use client";

import { useProducts } from "@/hooks/use-products";

interface ProductFilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function ProductFilterSelect({ value, onChange, className }: ProductFilterSelectProps) {
  const { data: products } = useProducts();

  if (!products || products.length === 0) return null;

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className || "h-9 rounded-lg border border-outline-variant bg-surface-container-low px-2.5 text-body text-on-surface outline-none hover:border-outline focus:border-primary focus:ring-2 focus:ring-primary/30 appearance-none cursor-pointer"}
    >
      <option value="">All Products</option>
      {products
        .filter((p) => p.status === "ACTIVE")
        .map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
    </select>
  );
}
