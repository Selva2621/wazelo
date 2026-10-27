"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterSelect } from "@/components/ui/filter-bar";
import { useContactsStore } from "@/stores/contacts-store";
import { useOrgMembers, useOrgTags } from "@/hooks/use-contacts";
import { useProducts } from "@/hooks/use-products";
import { useAuthStore } from "@/stores/auth-store";
import type { LeadStatus } from "@/lib/types/contacts";

const LEAD_STATUSES: { value: LeadStatus; label: string }[] = [
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "INTERESTED", label: "Interested" },
  { value: "CONVERTED", label: "Converted" },
  { value: "CLOSED", label: "Closed" },
];

function RemovableChip({ label, onRemove, kind }: { label: string; onRemove: () => void; kind: "tag" | "product" }) {
  return (
    <span className="inline-flex h-8 items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 pl-2.5 pr-1 text-label text-primary">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${kind} filter ${label}`}
        className="grid size-6 place-items-center rounded-md outline-none transition-colors hover:bg-primary/15 focus-visible:ring-2 focus-visible:ring-focus"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

/**
 * Owner, tag and product filters. Renders bare controls (no wrapper) so the page can put them
 * in its FilterBar. Pass showStatus={false} when the page already has status tabs.
 */
export function ContactFilters({ showStatus = true }: { showStatus?: boolean }) {
  const {
    filterStatus,
    filterOwnerId,
    filterSource,
    filterTagIds,
    filterProductIds,
    setFilterStatus,
    setFilterOwnerId,
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
    <>
      {showStatus && (
        <FilterSelect
          label="Status"
          active={!!filterStatus}
          value={filterStatus ?? ""}
          onChange={(e) => setFilterStatus(e.target.value ? (e.target.value as LeadStatus) : null)}
        >
          <option value="">All statuses</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </FilterSelect>
      )}

      {isAdminOrManager && (
        <FilterSelect
          label="Owner"
          active={!!filterOwnerId}
          value={filterOwnerId ?? ""}
          onChange={(e) => setFilterOwnerId(e.target.value || null)}
        >
          <option value="">All owners</option>
          {(members ?? []).map((m) => (
            <option key={m.id} value={m.id}>
              {m.firstName} {m.lastName}
            </option>
          ))}
        </FilterSelect>
      )}

      <FilterSelect
        label="Add tag filter"
        value=""
        onChange={(e) => {
          if (e.target.value && !filterTagIds.includes(e.target.value)) {
            setFilterTagIds([...filterTagIds, e.target.value]);
          }
        }}
      >
        <option value="">Tag</option>
        {(orgTags ?? [])
          .filter((t) => !filterTagIds.includes(t.id))
          .map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
      </FilterSelect>

      {filterTagIds.map((tagId) => (
        <RemovableChip
          key={tagId}
          kind="tag"
          label={orgTags?.find((t) => t.id === tagId)?.name ?? tagId}
          onRemove={() => setFilterTagIds(filterTagIds.filter((id) => id !== tagId))}
        />
      ))}

      {products && products.length > 0 && (
        <FilterSelect
          label="Add product filter"
          value=""
          onChange={(e) => {
            if (e.target.value && !filterProductIds.includes(e.target.value)) {
              setFilterProductIds([...filterProductIds, e.target.value]);
            }
          }}
        >
          <option value="">Product</option>
          {products
            .filter((p) => p.status === "ACTIVE" && !filterProductIds.includes(p.id))
            .map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
        </FilterSelect>
      )}

      {filterProductIds.map((productId) => (
        <RemovableChip
          key={productId}
          kind="product"
          label={products?.find((p) => p.id === productId)?.name ?? productId}
          onRemove={() => setFilterProductIds(filterProductIds.filter((id) => id !== productId))}
        />
      ))}

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-label">
          Clear
        </Button>
      )}
    </>
  );
}
