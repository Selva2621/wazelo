"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Megaphone, Save } from "lucide-react";
import {
  useSAAnnouncements,
  useSAArchiveAnnouncement,
  useSARestoreAnnouncement,
  useSACreateAnnouncement,
  useSAUpdateAnnouncement,
  useSAOrgs,
  useSAPlans,
} from "@/hooks/use-super-admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { CARD, TABLE_CARD, sentenceCase } from "@/components/super-admin/list-styles";

type Target = "ALL" | "PLAN" | "ORG";
type Severity = "INFO" | "WARNING" | "CRITICAL";

const inputClass =
  "w-full px-3 py-2 text-body-lg rounded-lg border border-outline-variant bg-surface-container-low text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";
const labelClass = "block text-label font-medium text-on-surface-variant mb-1";

function errorMessage(err: any, fallback: string): string {
  const message = err?.response?.data?.message;
  if (Array.isArray(message)) return message[0];
  return message ?? fallback;
}

function stateOf(a: any): { label: string; variant: "muted" | "info" | "success" } {
  const now = Date.now();
  if (a.archivedAt) return { label: "Archived", variant: "muted" };
  if (new Date(a.startsAt).getTime() > now) return { label: "Scheduled", variant: "info" };
  if (a.endsAt && new Date(a.endsAt).getTime() <= now) return { label: "Ended", variant: "muted" };
  return { label: "Live", variant: "success" };
}

/** datetime-local value → ISO string (local time), or undefined when empty */
function toIso(value: string) {
  return value ? new Date(value).toISOString() : undefined;
}

/** ISO string → datetime-local value (local time, minute precision), or "" */
function toLocalInput(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type OrgRef = { id: string; name: string };

/** The list row fields the edit form reads */
type AnnouncementRow = {
  id: string;
  title: string;
  body: string;
  severity: Severity;
  targetType: Target;
  targetPlanSlug: string | null;
  targetOrgId: string | null;
  targetOrgName?: string | null;
  startsAt: string;
  endsAt: string | null;
  dismissible: boolean;
};

/** Searches all organizations server-side, so any org can be targeted, not just the first page. */
function OrgPicker({
  id,
  value,
  onChange,
}: {
  id: string;
  value: OrgRef | null;
  onChange: (org: OrgRef | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isLoading, isError, refetch } = useSAOrgs({ limit: 10, search: search || undefined });
  const results: OrgRef[] = ((data?.orgs ?? []) as { id: string; name: string }[]).map((o) => ({ id: o.id, name: o.name }));

  if (value) {
    return (
      <div className="flex items-center gap-2">
        <span className={cn(inputClass, "truncate")}>{value.name}</span>
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
          Change
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <input
        id={id}
        type="search"
        className={inputClass}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or slug…"
        autoComplete="off"
      />
      <div className="max-h-48 overflow-y-auto rounded-lg border border-outline-variant">
        {isLoading ? (
          <div className="flex justify-center py-3" role="status">
            <Spinner className="text-primary" />
            <span className="sr-only">Searching organizations…</span>
          </div>
        ) : isError ? (
          <p className="px-3 py-2 text-body text-error" role="alert">
            Could not search organizations.{" "}
            <button type="button" onClick={() => refetch()} className="underline hover:no-underline">
              Try again
            </button>
          </p>
        ) : !results.length ? (
          <p className="px-3 py-2 text-body text-on-surface-variant">No organizations match.</p>
        ) : (
          <ul aria-label="Matching organizations">
            {results.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => onChange(o)}
                  className="w-full text-left px-3 py-2 text-body-lg text-on-surface hover:bg-surface-container-low focus-visible:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus"
                >
                  {o.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function SuperAdminAnnouncementsPage() {
  const uid = useId();
  const fid = (n: string) => `${uid}-${n}`;
  const { data: announcements, isLoading, isError, refetch } = useSAAnnouncements();
  const { data: plansData } = useSAPlans();
  const create = useSACreateAnnouncement();
  const update = useSAUpdateAnnouncement();
  const archive = useSAArchiveAnnouncement();
  const restore = useSARestoreAnnouncement();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [severity, setSeverity] = useState<Severity>("INFO");
  const [target, setTarget] = useState<Target>("ALL");
  const [planSlug, setPlanSlug] = useState("");
  const [org, setOrg] = useState<OrgRef | null>(null);
  /** Names of orgs picked in this session, for rows created before the list reloads */
  const [knownOrgNames, setKnownOrgNames] = useState<Record<string, string>>({});
  const [archiveTarget, setArchiveTarget] = useState<{ id: string; title: string } | null>(null);
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [dismissible, setDismissible] = useState(true);
  /** The announcement being edited in the form (null = creating a new one) */
  const [editing, setEditing] = useState<AnnouncementRow | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const planSlugs: { slug: string; name: string }[] = [
    ...new Map(((plansData?.plans ?? []) as any[]).map((p) => [p.slug, { slug: p.slug, name: p.name }])).values(),
  ];
  const orgName = (a: { targetOrgId?: string | null; targetOrg?: { name?: string } | null; targetOrgName?: string | null }): string =>
    a.targetOrg?.name ?? a.targetOrgName ?? (a.targetOrgId && knownOrgNames[a.targetOrgId]) ?? a.targetOrgId?.slice(0, 8) ?? "—";

  const pickOrg = (next: OrgRef | null) => {
    setOrg(next);
    if (next) setKnownOrgNames((m) => ({ ...m, [next.id]: next.name }));
  };

  const valid =
    title.trim().length >= 3 &&
    body.trim().length >= 3 &&
    (target !== "PLAN" || !!planSlug) &&
    (target !== "ORG" || !!org);

  const resetForm = () => {
    setTitle("");
    setBody("");
    setSeverity("INFO");
    setTarget("ALL");
    setPlanSlug("");
    setOrg(null);
    setStartsAt("");
    setEndsAt("");
    setDismissible(true);
    setEditing(null);
  };

  /** Loads a row into the form for editing. */
  const startEdit = (a: AnnouncementRow) => {
    setEditing(a);
    setTitle(a.title);
    setBody(a.body);
    setSeverity(a.severity);
    setTarget(a.targetType);
    setPlanSlug(a.targetPlanSlug ?? "");
    setOrg(a.targetOrgId ? { id: a.targetOrgId, name: orgName(a) } : null);
    setStartsAt(toLocalInput(a.startsAt));
    setEndsAt(toLocalInput(a.endsAt));
    setDismissible(a.dismissible);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /** Only the fields that differ from the row being edited. */
  const changedFields = (a: AnnouncementRow): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    if (title.trim() !== a.title) out.title = title;
    if (body.trim() !== a.body) out.body = body;
    if (severity !== a.severity) out.severity = severity;
    if (dismissible !== a.dismissible) out.dismissible = dismissible;
    if (target !== a.targetType) out.targetType = target;
    if (target === "PLAN" && planSlug !== a.targetPlanSlug) out.targetPlanSlug = planSlug;
    if (target === "ORG" && org && org.id !== a.targetOrgId) out.targetOrgId = org.id;
    if (startsAt && startsAt !== toLocalInput(a.startsAt)) out.startsAt = toIso(startsAt);
    if (endsAt !== toLocalInput(a.endsAt)) out.endsAt = toIso(endsAt) ?? null;
    return out;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      const data = changedFields(editing);
      if (!Object.keys(data).length) {
        toast.info("No changes to save.");
        return;
      }
      update.mutate(
        { id: editing.id, data },
        {
          onSuccess: () => {
            toast.success(`"${title.trim()}" updated.`);
            resetForm();
          },
          onError: (err) => toast.error(errorMessage(err, "Could not save the announcement")),
        },
      );
      return;
    }
    create.mutate(
      {
        title,
        body,
        severity,
        targetType: target,
        ...(target === "PLAN" && { targetPlanSlug: planSlug }),
        ...(target === "ORG" && org && { targetOrgId: org.id }),
        ...(toIso(startsAt) && { startsAt: toIso(startsAt) }),
        ...(toIso(endsAt) && { endsAt: toIso(endsAt) }),
        dismissible,
      },
      {
        onSuccess: () => {
          toast.success("Announcement published.");
          setTitle("");
          setBody("");
          setStartsAt("");
          setEndsAt("");
        },
        onError: (err) => toast.error(errorMessage(err, "Could not publish the announcement")),
      },
    );
  };

  const doRestore = (a: { id: string; title: string; endsAt?: string | null }) => {
    restore.mutate(a.id, {
      onSuccess: () => {
        const ended = a.endsAt && new Date(a.endsAt) < new Date();
        toast.success(
          ended
            ? `"${a.title}" restored, but its end date has passed so tenants won't see it.`
            : `"${a.title}" restored. People who dismissed it before won't see it again.`,
        );
      },
      onError: (err) => toast.error(errorMessage(err, "Could not restore")),
    });
  };

  const doArchive = (a: any) => {
    archive.mutate(a.id, {
      onSuccess: () => {
        setArchiveTarget(null);
        toast.success(`"${a.title}" archived — tenants no longer see it.`);
      },
      onError: (err) => {
        setArchiveTarget(null);
        toast.error(errorMessage(err, "Could not archive"));
      },
    });
  };

  const columns: DataTableColumn<NonNullable<typeof announcements>[number]>[] = [
    {
      id: "announcement",
      header: "Announcement",
      className: "max-w-sm",
      cell: (a) => (
        <>
          <p className="text-on-surface font-medium">{a.title}</p>
          <p className="text-label text-on-surface-variant line-clamp-2">{a.body}</p>
          <p className="text-label text-on-surface-variant mt-0.5">{sentenceCase(a.severity)}{a.dismissible ? "" : " · not dismissible"}</p>
        </>
      ),
    },
    {
      id: "state",
      header: "State",
      skeleton: "badge",
      cell: (a) => {
        const state = stateOf(a);
        return <Badge variant={state.variant}>{state.label}</Badge>;
      },
    },
    {
      id: "audience",
      header: "Audience",
      cellClassName: "text-on-surface-variant",
      cell: (a) => (a.targetType === "ALL" ? "Everyone" : a.targetType === "PLAN" ? `Plan: ${a.targetPlanSlug}` : orgName(a)),
    },
    {
      id: "window",
      header: "Window",
      cellClassName: "text-on-surface-variant whitespace-nowrap",
      cell: (a) => (
        <>
          {new Date(a.startsAt).toLocaleString()}
          <span className="block text-label">{a.endsAt ? `until ${new Date(a.endsAt).toLocaleString()}` : "no end"}</span>
        </>
      ),
    },
    {
      id: "dismissals",
      header: "Dismissed by",
      skeleton: "short",
      cellClassName: "text-on-surface-variant tabular-nums",
      cell: (a) => `${a.dismissals} users`,
    },
    {
      id: "actions",
      header: "Actions",
      hideHeader: true,
      align: "right",
      skeleton: "none",
      cellClassName: "whitespace-nowrap",
      cell: (a) => (
        <>
          {!a.archivedAt && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => startEdit(a)}
              disabled={editing?.id === a.id}
              aria-label={`Edit ${a.title}`}
            >
              Edit
            </Button>
          )}
          {a.archivedAt ? (
            <Button type="button" variant="ghost" size="sm" onClick={() => doRestore(a)} disabled={restore.isPending}>
              Restore
            </Button>
          ) : (
            <Button type="button" variant="ghost" size="sm" onClick={() => setArchiveTarget(a)} disabled={archive.isPending}>
              Archive
            </Button>
          )}
        </>
      ),
    },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-5xl">
      <PageHeader title="Announcements" count={announcements?.length} description="Banners at the top of tenants' app" />

      {/* Create */}
      <form ref={formRef} onSubmit={submit} className={cn(CARD, "p-5 space-y-4 scroll-mt-20")} aria-labelledby={fid("form")}>
        <h2 id={fid("form")} className="text-body-lg font-medium text-on-surface">
          {editing ? "Edit announcement" : "New announcement"}
        </h2>

        <div>
          <label htmlFor={fid("title")} className={labelClass}>Title</label>
          <input id={fid("title")} className={inputClass} maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Scheduled maintenance on Sunday" />
        </div>
        <div>
          <label htmlFor={fid("body")} className={labelClass}>Message</label>
          <textarea id={fid("body")} rows={3} maxLength={2000} className={`${inputClass} resize-none`} value={body} onChange={(e) => setBody(e.target.value)} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor={fid("severity")} className={labelClass}>Severity</label>
            <select id={fid("severity")} className={inputClass} value={severity} onChange={(e) => setSeverity(e.target.value as Severity)}>
              <option value="INFO">Info</option>
              <option value="WARNING">Warning</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>
          <div>
            <label htmlFor={fid("target")} className={labelClass}>Audience</label>
            <select id={fid("target")} className={inputClass} value={target} onChange={(e) => setTarget(e.target.value as Target)}>
              <option value="ALL">All organizations</option>
              <option value="PLAN">Organizations on a plan</option>
              <option value="ORG">One organization</option>
            </select>
          </div>
          {target === "PLAN" && (
            <div>
              <label htmlFor={fid("plan")} className={labelClass}>Plan</label>
              <select id={fid("plan")} className={inputClass} value={planSlug} onChange={(e) => setPlanSlug(e.target.value)}>
                <option value="">Choose a plan…</option>
                {planSlugs.map((p) => <option key={p.slug} value={p.slug}>{p.name} ({p.slug})</option>)}
              </select>
            </div>
          )}
          {target === "ORG" && (
            <div>
              <label htmlFor={fid("org")} className={labelClass}>Organization</label>
              <OrgPicker id={fid("org")} value={org} onChange={pickOrg} />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label htmlFor={fid("start")} className={labelClass}>Starts (optional — now if empty)</label>
            <input id={fid("start")} type="datetime-local" className={inputClass} value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </div>
          <div>
            <label htmlFor={fid("end")} className={labelClass}>Ends (optional)</label>
            <input id={fid("end")} type="datetime-local" className={inputClass} value={endsAt} min={startsAt || undefined} onChange={(e) => setEndsAt(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-body-lg text-on-surface-variant cursor-pointer pb-2">
            <input type="checkbox" checked={dismissible} onChange={(e) => setDismissible(e.target.checked)} className="h-4 w-4 rounded border-outline accent-primary" />
            Users can dismiss it
          </label>
        </div>

        <div className="flex justify-end gap-2">
          {editing ? (
            <>
              <Button type="button" variant="ghost" onClick={resetForm} disabled={update.isPending}>
                Cancel
              </Button>
              <Button type="submit" loading={update.isPending} disabled={!valid || update.isPending}>
                <Save className="h-4 w-4" aria-hidden /> Save changes
              </Button>
            </>
          ) : (
            <Button type="submit" loading={create.isPending} disabled={!valid || create.isPending}>
              <Megaphone className="h-4 w-4" aria-hidden /> Publish
            </Button>
          )}
        </div>
      </form>

      {/* List */}
      <section className={TABLE_CARD} aria-labelledby={fid("list")}>
        <h2 id={fid("list")} className="px-4 pt-4 text-body-lg font-medium text-on-surface">All announcements</h2>
        <DataTable
          label="Announcements"
          columns={columns}
          rows={announcements ?? []}
          rowKey={(a) => a.id}
          rowLabel={(a) => a.title}
          loading={isLoading}
          skeletonRows={4}
          error={isError}
          onRetry={() => refetch()}
          empty={{
            icon: <Megaphone className="h-12 w-12" />,
            title: "No announcements yet",
            compact: true,
          }}
          wrapperClassName="mt-2"
        />
      </section>

      <ConfirmDialog
        open={!!archiveTarget}
        title="Archive this announcement?"
        message={`"${archiveTarget?.title ?? ""}" will stop showing to tenants right away. You can restore it later from this list.`}
        confirmLabel="Archive"
        loading={archive.isPending}
        onConfirm={() => archiveTarget && doArchive(archiveTarget)}
        onCancel={() => setArchiveTarget(null)}
      />
    </div>
  );
}
