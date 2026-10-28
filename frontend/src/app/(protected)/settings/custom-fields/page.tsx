"use client";

import { useState } from "react";
import { SlidersHorizontal, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { FilterBar } from "@/components/ui/filter-bar";
import { Modal } from "@/components/ui/modal";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listFieldDefinitions, createFieldDefinition, updateFieldDefinition, deleteFieldDefinition,
  CustomFieldDefinition,
} from "@/lib/api/custom-fields";
import { PageHeader } from "@/components/layout/page-header";
import { usePageTitle } from "@/hooks/use-page-title";
import { MobilePageActions } from "@/components/mobile/mobile-page-actions";
import { IconButton } from "@/components/ui/icon-button";

const FIELD_TYPES = ["text", "number", "date", "select", "multiselect", "boolean", "url", "email", "phone"];
const ENTITIES = ["contact", "deal", "conversation"];

export default function CustomFieldsPage() {
  usePageTitle("Custom Fields");

  const qc = useQueryClient();
  const [entityFilter, setEntityFilter] = useState("contact");
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({
    entity: "contact", fieldName: "", fieldLabel: "", fieldType: "text",
    options: "", isRequired: false, defaultValue: "",
  });

  const { data: fields, isLoading } = useQuery({
    queryKey: ["custom-fields", entityFilter],
    queryFn: () => listFieldDefinitions(entityFilter),
  });

  const createMut = useMutation({
    mutationFn: (d: Parameters<typeof createFieldDefinition>[0]) => createFieldDefinition(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["custom-fields"] }); setShowCreate(false); resetForm(); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...d }: { id: string } & Parameters<typeof updateFieldDefinition>[1]) => updateFieldDefinition(id, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["custom-fields"] }); setShowCreate(false); setEditId(null); resetForm(); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFieldDefinition(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["custom-fields"] }),
  });

  const resetForm = () => setForm({ entity: "contact", fieldName: "", fieldLabel: "", fieldType: "text", options: "", isRequired: false, defaultValue: "" });

  const handleSubmit = () => {
    const opts = form.options ? form.options.split(",").map((s) => s.trim()).filter(Boolean) : undefined;
    if (editId) {
      updateMut.mutate({ id: editId, fieldLabel: form.fieldLabel, options: opts || null, isRequired: form.isRequired, defaultValue: form.defaultValue || null });
    } else {
      createMut.mutate({
        entity: form.entity, fieldName: form.fieldName, fieldLabel: form.fieldLabel,
        fieldType: form.fieldType, options: opts, isRequired: form.isRequired,
        defaultValue: form.defaultValue || undefined,
      });
    }
  };

  const startEdit = (f: CustomFieldDefinition) => {
    setForm({
      entity: f.entity, fieldName: f.fieldName, fieldLabel: f.fieldLabel, fieldType: f.fieldType,
      options: f.options?.join(", ") || "", isRequired: f.isRequired, defaultValue: f.defaultValue || "",
    });
    setEditId(f.id);
    setShowCreate(true);
  };

  const columns: DataTableColumn<CustomFieldDefinition>[] = [
    { id: "label", header: "Label", cellClassName: "text-body font-medium text-on-surface", cell: (f) => f.fieldLabel },
    { id: "name", header: "Field name", cellClassName: "text-label text-on-surface-variant font-mono", cell: (f) => f.fieldName },
    { id: "type", header: "Type", skeleton: "badge", cell: (f) => <Badge variant="muted" className="text-caption">{f.fieldType.charAt(0).toUpperCase() + f.fieldType.slice(1)}</Badge> },
    { id: "required", header: "Required", skeleton: "short", cellClassName: "text-label", cell: (f) => (f.isRequired ? "Yes" : "—") },
    { id: "default", header: "Default", cellClassName: "text-label text-on-surface-variant", cell: (f) => f.defaultValue || "—" },
    {
      id: "actions",
      header: "Actions",
      skeleton: "none",
      cell: (f) => (
        <div className="flex items-center gap-1">
          <IconButton size="xs" onClick={() => startEdit(f)} className="hover:text-primary" aria-label="Edit field" title="Edit field"><Pencil className="h-3.5 w-3.5" /></IconButton>
          <IconButton size="xs" variant="danger" onClick={() => deleteMut.mutate(f.id)} aria-label="Delete field" title="Delete field"><Trash2 className="h-3.5 w-3.5" /></IconButton>
        </div>
      ),
    },
  ];

  return (
    // Desktop: room around the page, like the other list pages
    <div className="space-y-4 max-lg:px-4 max-lg:pb-4 lg:p-6">
      <MobilePageActions primary={{ label: "New field", onClick: () => { resetForm(); setEditId(null); setShowCreate(true); } }} />
      <PageHeader
        title="Custom fields"
        count={fields?.length}
        className="max-lg:hidden"
        actions={
          <Button onClick={() => { resetForm(); setEditId(null); setShowCreate(true); }}>
            <Plus className="h-4 w-4 mr-1" /> New field
          </Button>
        }
      />

      {/* Entity filter chips */}
      <FilterBar className="mobile-scroll-x">
        <Tabs
          tabs={ENTITIES.map((e) => ({ id: e, label: `${e.charAt(0).toUpperCase() + e.slice(1)}s` }))}
          activeTab={entityFilter}
          onTabChange={setEntityFilter}
        />
      </FilterBar>

      <DataTable
        label="Custom fields"
        columns={columns}
        rows={fields ?? []}
        rowKey={(f) => f.id}
        rowLabel={(f) => f.fieldLabel}
        loading={isLoading}
        skeletonRows={5}
        empty={{
          icon: <SlidersHorizontal className="h-12 w-12" />,
          title: `No custom fields for ${entityFilter}s`,
          description: "Create custom fields to capture additional data.",
          actionLabel: "New field",
          onAction: () => setShowCreate(true),
        }}
      />

      {/* Create/Edit Modal */}
      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); setEditId(null); resetForm(); }}
        aria-labelledby="custom-field-modal-title"
        className="max-w-md rounded-2xl bg-surface"
      >
        {() => (
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/15">
              <h2 id="custom-field-modal-title" className="text-title font-semibold text-on-surface">{editId ? "Edit field" : "New custom field"}</h2>
              <button type="button" aria-label="Close" title="Close" onClick={() => { setShowCreate(false); setEditId(null); resetForm(); }} className="p-1 rounded-lg text-on-surface-variant hover:text-error outline-none focus-visible:ring-2 focus-visible:ring-focus">✕</button>
            </div>
            <div className="px-6 py-4 space-y-3">
              {!editId && (
                <>
                  <select aria-label="Entity" value={form.entity} onChange={(e) => setForm((f) => ({ ...f, entity: e.target.value }))} className="w-full rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-body">
                    {ENTITIES.map((e) => <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>)}
                  </select>
                  <input aria-label="Field name" value={form.fieldName} onChange={(e) => setForm((f) => ({ ...f, fieldName: e.target.value.replace(/[^a-z0-9_]/g, "") }))} placeholder="field_name (snake_case)" className="w-full rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-body font-mono" />
                </>
              )}
              <input aria-label="Display label" value={form.fieldLabel} onChange={(e) => setForm((f) => ({ ...f, fieldLabel: e.target.value }))} placeholder="Display label" className="w-full rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-body" />
              {!editId && (
                <select aria-label="Field type" value={form.fieldType} onChange={(e) => setForm((f) => ({ ...f, fieldType: e.target.value }))} className="w-full rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-body">
                  {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              )}
              {(form.fieldType === "select" || form.fieldType === "multiselect") && (
                <input aria-label="Options" value={form.options} onChange={(e) => setForm((f) => ({ ...f, options: e.target.value }))} placeholder="Options (comma-separated)" className="w-full rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-body" />
              )}
              <input aria-label="Default value" value={form.defaultValue} onChange={(e) => setForm((f) => ({ ...f, defaultValue: e.target.value }))} placeholder="Default value (optional)" className="w-full rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-body" />
              <label className="flex items-center gap-2 text-body cursor-pointer">
                <input type="checkbox" checked={form.isRequired} onChange={(e) => setForm((f) => ({ ...f, isRequired: e.target.checked }))} className="rounded" />
                Required field
              </label>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-outline-variant/15">
              <Button variant="ghost" onClick={() => { setShowCreate(false); setEditId(null); resetForm(); }}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={!form.fieldLabel.trim() || (!editId && !form.fieldName.trim())}>
                {editId ? "Update" : "Create"}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
