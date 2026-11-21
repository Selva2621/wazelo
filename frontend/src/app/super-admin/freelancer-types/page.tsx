"use client";

import { useId, useState } from "react";
import { Briefcase, Plus } from "lucide-react";
import { toast } from "sonner";
import { useSAFreelancerTypeActions, useSAFreelancerTypes } from "@/hooks/use-super-admin";
import type { FreelancerPitch, FreelancerTypeBody, FreelancerTypeEntry } from "@/lib/api/super-admin";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { CARD, TABLE_CARD } from "@/components/super-admin/list-styles";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full h-10 px-3 text-body-lg rounded-lg border border-outline-variant bg-surface-container-low text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";
const areaClass =
  "w-full px-3 py-2 text-body rounded-lg border border-outline-variant bg-surface-container-low text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 resize-y";
const labelClass = "block text-label font-medium text-on-surface-variant mb-1";

const PITCH_FIELDS: { key: keyof FreelancerPitch; label: string; hint: string }[] = [
  { key: "intro", label: "First message", hint: "Hi {{contact.name}}, I'm {{org.name}}, …" },
  { key: "portfolio", label: "Share portfolio", hint: "Hi {{contact.name}}, here is my work: {{lead.portfolio_link}} …" },
  { key: "followup", label: "Follow-up with a free offer", hint: "Hi {{contact.name}}, following up …" },
  { key: "packages", label: "Packages", hint: "Hi {{contact.name}}, here are my packages:\n- …\n- …" },
];

function errorMessage(err: unknown, fallback: string): string {
  const message = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  if (Array.isArray(message)) return message[0];
  return message ?? fallback;
}

const EMPTY: FreelancerTypeBody = {
  label: "",
  description: "",
  serviceLabel: "",
  keywords: [],
  pitch: { intro: "", portfolio: "", followup: "", packages: "" },
};

function TypeForm({ titleId, editing, onDone }: { titleId: string; editing: FreelancerTypeEntry | null; onDone: () => void }) {
  const { create, update } = useSAFreelancerTypeActions();
  const [form, setForm] = useState<FreelancerTypeBody>(editing ? { ...editing } : EMPTY);
  const [keywords, setKeywords] = useState((editing?.keywords ?? []).join(", "));
  const [serverError, setServerError] = useState<string | null>(null);
  const pending = create.isPending || update.isPending;

  const set = <K extends keyof FreelancerTypeBody>(key: K, value: FreelancerTypeBody[K]) => setForm((f) => ({ ...f, [key]: value }));
  const setPitch = (key: keyof FreelancerPitch, value: string) => setForm((f) => ({ ...f, pitch: { ...f.pitch, [key]: value } }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    const body = {
      label: form.label,
      description: form.description,
      serviceLabel: form.serviceLabel,
      pitch: form.pitch,
      keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
    };
    const done = {
      onSuccess: () => {
        toast.success(editing ? "Type updated" : "Type added");
        onDone();
      },
      onError: (err: unknown) => setServerError(errorMessage(err, "Could not save the type.")),
    };
    if (editing) update.mutate({ id: editing.id, ...body }, done);
    else create.mutate(body, done);
  };

  const filled =
    form.label.trim() && form.description.trim() && form.serviceLabel.trim() && Object.values(form.pitch).every((v) => v.trim().length >= 20);

  return (
    <form onSubmit={submit} className="p-6 space-y-4" noValidate>
      <div>
        <h2 id={titleId} className="text-title-sm font-semibold text-on-surface">
          {editing ? `Edit ${editing.label}` : "New freelancer type"}
        </h2>
        <p className="text-body text-on-surface-variant mt-0.5">
          Shows as a card in setup. Orgs that pick it get these four templates.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="ft-label" className={labelClass}>Card title</label>
          <input id="ft-label" className={inputClass} value={form.label} maxLength={60} placeholder="Home Baker"
            onChange={(e) => set("label", e.target.value)} />
        </div>
        <div>
          <label htmlFor="ft-service" className={labelClass}>Service in words</label>
          <input id="ft-service" className={inputClass} value={form.serviceLabel} maxLength={120} placeholder="custom cakes and baking"
            onChange={(e) => set("serviceLabel", e.target.value)} />
        </div>
      </div>
      <div>
        <label htmlFor="ft-desc" className={labelClass}>Card subtitle</label>
        <input id="ft-desc" className={inputClass} value={form.description} maxLength={120} placeholder="Birthday and wedding cakes, desserts"
          onChange={(e) => set("description", e.target.value)} />
      </div>
      <div>
        <label htmlFor="ft-keywords" className={labelClass}>Search words (comma separated)</label>
        <input id="ft-keywords" className={inputClass} value={keywords} placeholder="baker, cakes, bakery, desserts"
          onChange={(e) => setKeywords(e.target.value)} />
        <p className="text-caption text-on-surface-variant mt-1">
          Used by setup search, and to match what people type under &ldquo;Something else&rdquo;.
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-label text-on-surface-variant">
          Templates can use <code>{"{{contact.name}}"}</code>, <code>{"{{org.name}}"}</code> and <code>{"{{lead.portfolio_link}}"}</code>.
        </p>
        {PITCH_FIELDS.map((f) => (
          <div key={f.key}>
            <label htmlFor={`ft-${f.key}`} className={labelClass}>{f.label}</label>
            <textarea id={`ft-${f.key}`} rows={f.key === "packages" ? 5 : 3} maxLength={1000} className={areaClass}
              value={form.pitch[f.key]} placeholder={f.hint} onChange={(e) => setPitch(f.key, e.target.value)} />
          </div>
        ))}
      </div>

      {serverError && <Alert variant="error">{serverError}</Alert>}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onDone} disabled={pending}>Cancel</Button>
        <Button type="submit" loading={pending} disabled={!filled}>{editing ? "Save" : "Add type"}</Button>
      </div>
    </form>
  );
}

export default function SuperAdminFreelancerTypesPage() {
  const { data, isLoading, isError, refetch } = useSAFreelancerTypes();
  const { update, remove } = useSAFreelancerTypeActions();
  const titleId = useId();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<FreelancerTypeEntry | null>(null);
  const [deleting, setDeleting] = useState<FreelancerTypeEntry | null>(null);
  const custom = data?.custom ?? [];

  const openForm = (entry: FreelancerTypeEntry | null) => {
    setEditing(entry);
    setFormOpen(true);
  };

  const toggle = (t: FreelancerTypeEntry) =>
    update.mutate(
      { id: t.id, isActive: !t.isActive },
      {
        onSuccess: () => toast.success(t.isActive ? `${t.label} hidden from setup` : `${t.label} shown in setup`),
        onError: (err) => toast.error(errorMessage(err, "Could not update the type.")),
      },
    );

  const columns: DataTableColumn<FreelancerTypeEntry>[] = [
    {
      id: "type",
      header: "Type",
      cell: (t) => (
        <>
          <div className="text-on-surface font-medium">{t.label}</div>
          <div className="text-body text-on-surface-variant">{t.description}</div>
        </>
      ),
    },
    {
      id: "keywords",
      header: "Search words",
      cellClassName: "text-body text-on-surface-variant max-w-xs truncate",
      cell: (t) => <span title={t.keywords.join(", ")}>{t.keywords.join(", ") || "—"}</span>,
    },
    { id: "orgs", header: "Orgs", skeleton: "short", cellClassName: "tabular-nums text-on-surface", cell: (t) => t.usageCount },
    {
      id: "status",
      header: "Status",
      skeleton: "badge",
      cell: (t) => <Badge dot variant={t.isActive ? "success" : "muted"}>{t.isActive ? "Shown" : "Hidden"}</Badge>,
    },
    {
      id: "actions",
      header: "Actions",
      hideHeader: true,
      align: "right",
      skeleton: "none",
      cellClassName: "whitespace-nowrap",
      cell: (t) => (
        <>
          <Button size="sm" variant="ghost" onClick={() => openForm(t)}>Edit</Button>
          <Button size="sm" variant="ghost" onClick={() => toggle(t)} disabled={update.isPending}>
            {t.isActive ? "Hide" : "Show"}
          </Button>
          <Button size="sm" variant="ghost" className="text-error" onClick={() => setDeleting(t)}>Delete</Button>
        </>
      ),
    },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <PageHeader
        title="Freelancer types"
        description="Picked by freelancers in setup"
        actions={
          <Button onClick={() => openForm(null)}>
            <Plus className="h-4 w-4" aria-hidden /> Add type
          </Button>
        }
      />

      <section className={TABLE_CARD}>
        <h2 className="px-4 pt-4 text-body-lg font-semibold text-on-surface">Added by you</h2>
        <DataTable
          label="Freelancer types added by super admins"
          columns={columns}
          rows={custom}
          rowKey={(t) => t.id}
          rowLabel={(t) => t.label}
          loading={isLoading}
          skeletonRows={4}
          error={isError}
          onRetry={() => refetch()}
          empty={{
            icon: <Briefcase className="h-10 w-10" aria-hidden />,
            title: "No extra types yet",
            description: "The built-in types below cover most freelancers. Add one when people keep typing the same service.",
            actionLabel: "Add type",
            onAction: () => openForm(null),
          }}
        />
      </section>

      <section className={cn(CARD, "p-4")}>
        <h2 className="flex items-baseline gap-2 text-body-lg font-semibold text-on-surface">
          Built in <span className="text-body font-normal tabular-nums text-on-surface-variant">{data?.builtIn.length ?? 0}</span>
        </h2>
        <p className="text-body text-on-surface-variant mb-3">Popular ones show first in setup.</p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
          {(data?.builtIn ?? []).map((b) => (
            <li key={b.key} className="rounded-xl px-3 py-2 transition-colors hover:bg-surface-container-low">
              <div className="flex items-center gap-2 text-body-lg text-on-surface">
                {b.label}
                {b.popular && <Badge variant="muted">Popular</Badge>}
              </div>
              <div className="text-body text-on-surface-variant">{b.description}</div>
            </li>
          ))}
        </ul>
      </section>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} aria-labelledby={titleId} className="max-w-2xl">
        {() => <TypeForm key={editing?.id ?? "new"} titleId={titleId} editing={editing} onDone={() => setFormOpen(false)} />}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title={`Delete ${deleting?.label ?? ""}?`}
        message="It disappears from setup. Orgs that already picked it keep their templates. Hide it instead if you might bring it back."
        confirmLabel="Delete"
        variant="danger"
        loading={remove.isPending}
        onConfirm={() =>
          deleting &&
          remove.mutate(deleting.id, {
            onSuccess: () => {
              toast.success(`${deleting.label} deleted`);
              setDeleting(null);
            },
            onError: (err) => toast.error(errorMessage(err, "Could not delete the type.")),
          })
        }
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
