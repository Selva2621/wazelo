"use client";

import { X, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useContactsStore } from "@/stores/contacts-store";
import { useOrgMembers, useOrgTags } from "@/hooks/use-contacts";
import { useProducts } from "@/hooks/use-products";
import { useAuthStore } from "@/stores/auth-store";
import type { LeadStatus, ContactSource } from "@/lib/types/contacts";

const LEAD_STATUSES: { value: LeadStatus; label: string }[] = [
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "INTERESTED", label: "Interested" },
  { value: "CONVERTED", label: "Converted" },
  { value: "CLOSED", label: "Closed" },
];

const SOURCES: { value: ContactSource; label: string }[] = [
  { value: "WHATSAPP", label: "WhatsApp" },
  { value: "MANUAL", label: "Manual" },
  { value: "IMPORT", label: "Import" },
  { value: "API", label: "API" },
];

export function ContactFilters() {
  const {
    filterStatus,
    filterOwnerId,
    filterSource,
    filterTagIds,
    filterProductIds,
    setFilterStatus,
    setFilterOwnerId,
    setFilterSource,
    setFilterTagIds,
    setFilterProductIds,
    clearFilters,
  } = useContactsStore();

  const role = useAuthStore((s) => s.user?.role);
  const isAdminOrManager = role === "ADMIN" || role === "MANAGER";
  const { data: members } = useOrgMembers();
  const { data: orgTags } = useOrgTags();
  const { data: products } = useProducts();

  const hasFilters = filterStatus || filterOwnerId || filterSource || filterTagIds.length > 0 || filterProductIds.length > 0;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Filter className="h-4 w-4 text-on-surface-variant/50 shrink-0" />

      {/* Status */}
      <select
        value={filterStatus ?? ""}
        onChange={(e) =>
          setFilterStatus(e.target.value ? (e.target.value as LeadStatus) : null)
        }
        className="h-8 rounded-lg bg-surface-container-low px-2.5 text-[12px] text-on-surface-variant outline-none focus:ring-1 focus:ring-primary/40 appearance-none cursor-pointer"
      >
        <option value="">All Statuses</option>
        {LEAD_STATUSES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      {/* Owner — admin/manager only */}
      {isAdminOrManager && (
        <select
          value={filterOwnerId ?? ""}
          onChange={(e) => setFilterOwnerId(e.target.value || null)}
          className="h-8 rounded-lg bg-surface-container-low px-2.5 text-[12px] text-on-surface-variant outline-none focus:ring-1 focus:ring-primary/40 appearance-none cursor-pointer"
        >
          <option value="">All Owners</option>
          {(members ?? []).map((m) => (
            <option key={m.id} value={m.id}>
              {m.firstName} {m.lastName}
            </option>
          ))}
        </select>
      )}

      {/* Source */}
      <select
        value={filterSource ?? ""}
        onChange={(e) =>
          setFilterSource(e.target.value ? (e.target.value as ContactSource) : null)
        }
        className="h-8 rounded-lg bg-surface-container-low px-2.5 text-[12px] text-on-surface-variant outline-none focus:ring-1 focus:ring-primary/40 appearance-none cursor-pointer"
      >
        <option value="">All Sources</option>
        {SOURCES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      {/* Tags */}
      <select
        value=""
        onChange={(e) => {
          if (e.target.value && !filterTagIds.includes(e.target.value)) {
            setFilterTagIds([...filterTagIds, e.target.value]);
          }
        }}
        className="h-8 rounded-lg bg-surface-container-low px-2.5 text-[12px] text-on-surface-variant outline-none focus:ring-1 focus:ring-primary/40 appearance-none cursor-pointer"
      >
        <option value="">Filter by Tag</option>
        {(orgTags ?? [])
          .filter((t) => !filterTagIds.includes(t.id))
          .map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
      </select>

      {/* Active tag chips */}
      {filterTagIds.map((tagId) => {
        const tag = orgTags?.find((t) => t.id === tagId);
        return (
          <span
            key={tagId}
            className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary"
          >
            {tag?.name ?? tagId}
            <button
              onClick={() =>
                setFilterTagIds(filterTagIds.filter((id) => id !== tagId))
              }
              className="rounded-full p-0.5 hover:bg-primary/20 transition-colors"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        );
      })}

      {/* Products */}
      {products && products.length > 0 && (
        <select
          value=""
          onChange={(e) => {
            if (e.target.value && !filterProductIds.includes(e.target.value)) {
              setFilterProductIds([...filterProductIds, e.target.value]);
            }
          }}
          className="h-8 rounded-lg bg-surface-container-low px-2.5 text-[12px] text-on-surface-variant outline-none focus:ring-1 focus:ring-primary/40 appearance-none cursor-pointer"
        >
          <option value="">Filter by Product</option>
          {products
            .filter((p) => p.status === "ACTIVE" && !filterProductIds.includes(p.id))
            .map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
        </select>
      )}

      {/* Active product chips */}
      {filterProductIds.map((productId) => {
        const product = products?.find((p) => p.id === productId);
        return (
          <span
            key={productId}
            className="inline-flex items-center gap-1 rounded-full bg-tertiary/10 px-2 py-0.5 text-[11px] text-tertiary"
          >
            {product?.name ?? productId}
            <button
              onClick={() => setFilterProductIds(filterProductIds.filter((id) => id !== productId))}
              className="rounded-full p-0.5 hover:bg-tertiary/20 transition-colors"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        );
      })}

      {/* Clear all */}
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-[12px]">
          Clear
        </Button>
      )}
    </div>
  );
}
