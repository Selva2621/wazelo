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
      className={className || "h-9 rounded-lg bg-surface-container-low px-2.5 text-[12px] text-on-surface-variant outline-none focus:ring-1 focus:ring-primary/40 appearance-none cursor-pointer border border-outline-variant/15"}
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
