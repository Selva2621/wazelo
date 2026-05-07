"use client";

import { useState } from "react";
import { SlidersHorizontal, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table, TableHeader, TableHeaderRow, TableHead, TableBody, TableRow, TableCell,
} from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listFieldDefinitions, createFieldDefinition, updateFieldDefinition, deleteFieldDefinition,
  CustomFieldDefinition,
} from "@/lib/api/custom-fields";
import { usePageTitle } from "@/hooks/use-page-title";

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-on-surface flex items-center gap-2">
            <SlidersHorizontal className="h-6 w-6 text-primary" />
            Custom Fields
          </h1>
          <p className="text-[13px] text-on-surface-variant mt-0.5">Define custom fields for contacts, deals, and conversations</p>
        </div>
        <Button onClick={() => { resetForm(); setEditId(null); setShowCreate(true); }}>
          <Plus className="h-4 w-4 mr-1" /> New Field
        </Button>
      </div>

      {/* Entity filter tabs */}
      <div className="flex gap-1 bg-surface-container rounded-xl p-1 w-fit">
        {ENTITIES.map((e) => (
          <button
            key={e}
            onClick={() => setEntityFilter(e)}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${entityFilter === e ? "bg-primary text-on-primary" : "text-on-surface-variant hover:text-on-surface"}`}
          >
            {e.charAt(0).toUpperCase() + e.slice(1)}s
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" className="text-primary" /></div>
      ) : !fields?.length ? (
        <EmptyState
          icon={<SlidersHorizontal className="h-12 w-12" />}
          title={`No custom fields for ${entityFilter}s`}
          description="Create custom fields to capture additional data."
          actionLabel="New Field"
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableHeaderRow>
              <TableHead>Label</TableHead>
              <TableHead>Field Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Required</TableHead>
              <TableHead>Default</TableHead>
              <TableHead>Actions</TableHead>
            </TableHeaderRow>
          </TableHeader>
          <TableBody>
            {fields.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="text-[13px] font-medium text-on-surface">{f.fieldLabel}</TableCell>
                <TableCell className="text-[12px] text-on-surface-variant font-mono">{f.fieldName}</TableCell>
                <TableCell><Badge variant="muted" className="text-[10px]">{f.fieldType}</Badge></TableCell>
                <TableCell className="text-[12px]">{f.isRequired ? "Yes" : "—"}</TableCell>
                <TableCell className="text-[12px] text-on-surface-variant">{f.defaultValue || "—"}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <button onClick={() => startEdit(f)} className="p-1 rounded text-on-surface-variant hover:text-primary"><Pencil className="h-3.5 w-3.5" /></button>
                    <button onClick={() => deleteMut.mutate(f.id)} className="p-1 rounded text-on-surface-variant hover:text-error"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Create/Edit Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/40">
          <div className="w-full max-w-md rounded-3xl bg-surface shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/15">
              <h2 className="text-lg font-semibold text-on-surface">{editId ? "Edit Field" : "New Custom Field"}</h2>
              <button onClick={() => { setShowCreate(false); setEditId(null); resetForm(); }} className="p-1 rounded-lg text-on-surface-variant hover:text-error">✕</button>
            </div>
            <div className="px-6 py-4 space-y-3">
              {!editId && (
                <>
                  <select value={form.entity} onChange={(e) => setForm((f) => ({ ...f, entity: e.target.value }))} className="w-full rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-[13px]">
                    {ENTITIES.map((e) => <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>)}
                  </select>
                  <input value={form.fieldName} onChange={(e) => setForm((f) => ({ ...f, fieldName: e.target.value.replace(/[^a-z0-9_]/g, "") }))} placeholder="field_name (snake_case)" className="w-full rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-[13px] font-mono" />
                </>
              )}
              <input value={form.fieldLabel} onChange={(e) => setForm((f) => ({ ...f, fieldLabel: e.target.value }))} placeholder="Display Label" className="w-full rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-[13px]" />
              {!editId && (
                <select value={form.fieldType} onChange={(e) => setForm((f) => ({ ...f, fieldType: e.target.value }))} className="w-full rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-[13px]">
                  {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              )}
              {(form.fieldType === "select" || form.fieldType === "multiselect") && (
                <input value={form.options} onChange={(e) => setForm((f) => ({ ...f, options: e.target.value }))} placeholder="Options (comma-separated)" className="w-full rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-[13px]" />
              )}
              <input value={form.defaultValue} onChange={(e) => setForm((f) => ({ ...f, defaultValue: e.target.value }))} placeholder="Default value (optional)" className="w-full rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-[13px]" />
              <label className="flex items-center gap-2 text-[13px] cursor-pointer">
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
          </div>
        </div>
      )}
    </div>
  );
}
