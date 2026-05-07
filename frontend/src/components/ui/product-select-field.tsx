"use client";

import { useRouter } from "next/navigation";
import { Package, ArrowRight } from "lucide-react";
import { useProducts } from "@/hooks/use-products";

interface ProductSelectFieldProps {
  /** Current selected product id ("" = none) */
  value: string;
  onChange: (id: string) => void;
  /** Label shown above the select. Defaults to "Product" */
  label?: string;
  /** Show "(optional)" hint next to label. Defaults to true */
  optional?: boolean;
  /** Extra className on the wrapping div */
  className?: string;
  /** Called before router.push so parent can close modal etc. */
  onBeforeRedirect?: () => void;
  /** Filter to only ACTIVE products. Defaults to true */
  activeOnly?: boolean;
}

/**
 * Drop-in product selector.
 * – Products exist  → shows a <select> dropdown.
 * – No products yet → shows an inline banner with a redirect to /settings/products.
 */
export function ProductSelectField({
  value,
  onChange,
  label = "Product",
  optional = true,
  className,
  onBeforeRedirect,
  activeOnly = true,
}: ProductSelectFieldProps) {
  const router = useRouter();
  const { data: products, isLoading } = useProducts();

  const filtered = (products ?? []).filter(
    (p) => !activeOnly || p.status === "ACTIVE",
  );
  const hasProducts = !isLoading && filtered.length > 0;
  const noProducts  = !isLoading && filtered.length === 0;

  const selectCls =
    "w-full rounded-xl bg-surface-container-low px-4 py-3 text-[13px] text-on-surface outline-none focus:bg-surface-container focus:ring-2 focus:ring-primary/40 border border-outline-variant/10";

  return (
    <div className={className}>
      <p className="text-[12px] font-medium text-on-surface-variant mb-1">
        {label}
        {optional && (
          <span className="ml-1 font-normal text-on-surface-variant/50">
            (optional)
          </span>
        )}
      </p>

      {isLoading && (
        <div className={`${selectCls} text-on-surface-variant/40 animate-pulse`}>
          Loading products…
        </div>
      )}

      {hasProducts && (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={selectCls}
        >
          <option value="">No product</option>
          {filtered.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}

      {noProducts && (
        <div className="rounded-xl border border-outline-variant/15 bg-surface-container p-3.5 flex items-start gap-3">
          <Package className="h-4 w-4 text-on-surface-variant shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-on-surface">
              No products yet
            </p>
            <p className="text-[11px] text-on-surface-variant/60 mt-0.5">
              Create at least one product to link it here.
            </p>
            <button
              type="button"
              onClick={() => {
                onBeforeRedirect?.();
                router.push("/settings/products");
              }}
              className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-primary hover:underline"
            >
              Go to Products
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
