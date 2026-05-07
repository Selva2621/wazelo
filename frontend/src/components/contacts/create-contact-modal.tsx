"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Tag, Package, ChevronDown, ArrowRight } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useCreateContact,
  useOrgMembers,
  useOrgTags,
  useAddTag,
} from "@/hooks/use-contacts";
import { useProducts, useAssignProduct } from "@/hooks/use-products";
import {
  createContactSchema,
  type CreateContactFormData,
} from "@/lib/validations/contacts";
import type { Tag as TagType } from "@/lib/types/contacts";
import type { Product } from "@/lib/types/products";

interface CreateContactModalProps {
  open: boolean;
  onClose: () => void;
}

function MultiSelect<T extends { id: string; name: string }>({
  label,
  icon: Icon,
  items,
  selected,
  onToggle,
  colorDot,
}: {
  label: string;
  icon: React.ElementType;
  items: T[];
  selected: string[];
  onToggle: (id: string) => void;
  colorDot?: (item: T) => string | null | undefined;
}) {
  const [open, setOpen] = useState(false);
  const selectedItems = items.filter((i) => selected.includes(i.id));

  return (
    <div className="relative">
      <Label>{label}</Label>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-surface-container-low text-[13px] text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 mt-1"
      >
        <Icon className="h-4 w-4 text-on-surface-variant shrink-0" />
        <span className="flex-1 text-left truncate">
          {selectedItems.length === 0 ? (
            <span className="text-on-surface-variant/50">Select {label.toLowerCase()}…</span>
          ) : (
            <span className="flex gap-1 flex-wrap">
              {selectedItems.map((item) => (
                <span
                  key={item.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-medium"
                >
                  {colorDot && colorDot(item) && (
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ background: colorDot(item)! }}
                    />
                  )}
                  {item.name}
                </span>
              ))}
            </span>
          )}
        </span>
        <ChevronDown className={`h-4 w-4 text-on-surface-variant shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-10 mt-1 w-full rounded-xl bg-surface-container-lowest border border-outline-variant/15 shadow-lg max-h-48 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-3 py-2.5 text-[12px] text-on-surface-variant/50">No {label.toLowerCase()} found</p>
          ) : (
            items.map((item) => {
              const isSelected = selected.includes(item.id);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onToggle(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-left hover:bg-surface-container transition-colors ${isSelected ? "text-primary" : "text-on-surface"}`}
                >
                  {colorDot && colorDot(item) && (
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ background: colorDot(item)! }}
                    />
                  )}
                  <span className="flex-1">{item.name}</span>
                  {isSelected && (
                    <span className="h-4 w-4 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <X className="h-2.5 w-2.5 text-on-primary" />
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export function CreateContactModal({ open, onClose }: CreateContactModalProps) {
  const router = useRouter();
  const createContact = useCreateContact();
  const addTag = useAddTag();
  const assignProduct = useAssignProduct();

  const { data: members } = useOrgMembers();
  const { data: orgTags } = useOrgTags();
  const { data: products, isLoading: productsLoading } = useProducts();

  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  const hasNoProducts = !productsLoading && (products ?? []).length === 0;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateContactFormData>({
    resolver: zodResolver(createContactSchema),
    defaultValues: { source: "MANUAL" },
  });

  function toggleTag(id: string) {
    setSelectedTagIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  function toggleProduct(id: string) {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  function onSubmit(data: CreateContactFormData) {
    const payload = {
      ...data,
      email: data.email || undefined,
    };

    createContact.mutate(payload, {
      onSuccess: (created) => {
        const contactId = created.id;

        // Assign selected tags (by name, using existing org tag data)
        const tagsToAdd = (orgTags ?? []).filter((t) => selectedTagIds.includes(t.id));
        tagsToAdd.forEach((tag) => {
          addTag.mutate({ contactId, name: tag.name, color: tag.color ?? undefined });
        });

        // Assign selected products
        selectedProductIds.forEach((productId) => {
          assignProduct.mutate({ contactId, productId });
        });

        reset();
        setSelectedTagIds([]);
        setSelectedProductIds([]);
        onClose();
      },
    });
  }

  if (!open) return null;

  const tagItems: TagType[] = orgTags ?? [];
  const productItems: Product[] = products ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-surface/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl bg-surface-container-lowest border border-outline-variant/15 shadow-xl p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[16px] font-semibold text-on-surface">
            New Contact
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="phoneNumber">Phone Number *</Label>
            <Input
              id="phoneNumber"
              placeholder="+1234567890"
              error={errors.phoneNumber?.message}
              {...register("phoneNumber")}
            />
          </div>

          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="Contact name"
              error={errors.name?.message}
              {...register("name")}
            />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@example.com"
              error={errors.email?.message}
              {...register("email")}
            />
          </div>

          <div>
            <Label htmlFor="source">Source</Label>
            <select
              id="source"
              {...register("source")}
              className="w-full rounded-xl bg-surface-container-low px-4 py-3 text-[15px] text-on-surface outline-none focus:bg-surface-container focus:ring-2 focus:ring-primary/40"
            >
              <option value="MANUAL">Manual</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="IMPORT">Import</option>
              <option value="API">API</option>
            </select>
          </div>

          <div>
            <Label htmlFor="ownerId">Assign To</Label>
            <select
              id="ownerId"
              {...register("ownerId")}
              className="w-full rounded-xl bg-surface-container-low px-4 py-3 text-[15px] text-on-surface outline-none focus:bg-surface-container focus:ring-2 focus:ring-primary/40"
            >
              <option value="">Me (default)</option>
              {(members ?? []).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.firstName} {m.lastName}
                </option>
              ))}
            </select>
          </div>

          <MultiSelect
            label="Tags"
            icon={Tag}
            items={tagItems}
            selected={selectedTagIds}
            onToggle={toggleTag}
            colorDot={(t) => t.color}
          />

          {hasNoProducts ? (
            <div className="rounded-xl border border-outline-variant/15 bg-surface-container p-3.5 flex items-start gap-3">
              <Package className="h-4 w-4 text-on-surface-variant shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-on-surface">No products yet</p>
                <p className="text-[11px] text-on-surface-variant/60 mt-0.5">
                  Create at least one product to assign it to contacts.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    router.push("/settings/products");
                  }}
                  className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-primary hover:underline"
                >
                  Go to Products
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          ) : (
            <MultiSelect
              label="Products"
              icon={Package}
              items={productItems}
              selected={selectedProductIds}
              onToggle={toggleProduct}
            />
          )}

          {createContact.isError && (
            <p className="text-[13px] text-error">
              {(createContact.error as Error)?.message ||
                "Failed to create contact"}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createContact.isPending}
              className="flex-1"
            >
              Create
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
