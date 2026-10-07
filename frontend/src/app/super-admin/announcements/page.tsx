"use client";

import { useId, useState } from "react";
import { Megaphone } from "lucide-react";
import {
  useSAAnnouncements,
  useSAArchiveAnnouncement,
  useSACreateAnnouncement,
  useSAOrgs,
  useSAPlans,
} from "@/hooks/use-super-admin";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

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

function stateOf(a: any): { label: string; className: string } {
  const now = Date.now();
  if (a.archivedAt) return { label: "Archived", className: "bg-surface-container text-on-surface-variant" };
  if (new Date(a.startsAt).getTime() > now) return { label: "Scheduled", className: "bg-info/10 text-info" };
  if (a.endsAt && new Date(a.endsAt).getTime() <= now) return { label: "Ended", className: "bg-surface-container text-on-surface-variant" };
  return { label: "Live", className: "bg-success/10 text-success" };
}

/** datetime-local value → ISO string (local time), or undefined when empty */
function toIso(value: string) {
  return value ? new Date(value).toISOString() : undefined;
}

export default function SuperAdminAnnouncementsPage() {
  const uid = useId();
  const fid = (n: string) => `${uid}-${n}`;
  const { data: announcements, isLoading } = useSAAnnouncements();
  const { data: plansData } = useSAPlans();
  const { data: orgsData } = useSAOrgs({ limit: 100 });
  const create = useSACreateAnnouncement();
  const archive = useSAArchiveAnnouncement();

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [severity, setSeverity] = useState<Severity>("INFO");
  const [target, setTarget] = useState<Target>("ALL");
  const [planSlug, setPlanSlug] = useState("");
  const [orgId, setOrgId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [dismissible, setDismissible] = useState(true);
  const [status, setStatus] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const planSlugs: { slug: string; name: string }[] = [
    ...new Map(((plansData?.plans ?? []) as any[]).map((p) => [p.slug, { slug: p.slug, name: p.name }])).values(),
  ];
  const orgs: any[] = orgsData?.orgs ?? [];
  const orgName = (id: string) => orgs.find((o) => o.id === id)?.name ?? id.slice(0, 8);

  const valid =
    title.trim().length >= 3 &&
    body.trim().length >= 3 &&
    (target !== "PLAN" || !!planSlug) &&
    (target !== "ORG" || !!orgId);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus(null);
    create.mutate(
      {
        title,
        body,
        severity,
        targetType: target,
        ...(target === "PLAN" && { targetPlanSlug: planSlug }),
        ...(target === "ORG" && { targetOrgId: orgId }),
        ...(toIso(startsAt) && { startsAt: toIso(startsAt) }),
        ...(toIso(endsAt) && { endsAt: toIso(endsAt) }),
        dismissible,
      },
      {
        onSuccess: () => {
          setStatus({ kind: "success", text: "Announcement published." });
          setTitle("");
          setBody("");
          setStartsAt("");
          setEndsAt("");
        },
        onError: (err) => setStatus({ kind: "error", text: errorMessage(err, "Could not publish the announcement") }),
      },
    );
  };

  const doArchive = (a: any) => {
    setStatus(null);
    archive.mutate(a.id, {
      onSuccess: () => setStatus({ kind: "success", text: `"${a.title}" archived — tenants no longer see it.` }),
      onError: (err) => setStatus({ kind: "error", text: errorMessage(err, "Could not archive") }),
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-title font-semibold text-on-surface">Announcements</h1>
        <p className="text-body-lg text-on-surface-variant">
          Messages shown as a banner at the top of tenants&apos; app — maintenance, outages, new features.
        </p>
      </div>

      {status && <Alert variant={status.kind}>{status.text}</Alert>}

      {/* Create */}
      <form onSubmit={submit} className="bg-surface-container-low border border-outline-variant rounded-xl p-5 space-y-4" aria-labelledby={fid("form")}>
        <h2 id={fid("form")} className="text-body-lg font-medium text-on-surface">New announcement</h2>

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
              <select id={fid("org")} className={inputClass} value={orgId} onChange={(e) => setOrgId(e.target.value)}>
                <option value="">Choose an organization…</option>
                {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
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

        <div className="flex justify-end">
          <Button type="submit" loading={create.isPending} disabled={!valid || create.isPending}>
            <Megaphone className="h-4 w-4" aria-hidden /> Publish
          </Button>
        </div>
      </form>

      {/* List */}
      <section className="bg-surface-container-low border border-outline-variant rounded-xl overflow-x-auto" aria-labelledby={fid("list")}>
        <h2 id={fid("list")} className="px-4 pt-4 text-body-lg font-medium text-on-surface">All announcements</h2>
        {isLoading ? (
          <div className="flex justify-center py-10" role="status"><Spinner className="text-primary" /><span className="sr-only">Loading…</span></div>
        ) : !announcements?.length ? (
          <p className="px-4 pb-4 pt-1 text-body-lg text-on-surface-variant">No announcements yet.</p>
        ) : (
          <table className="w-full mt-2 text-body-lg">
            <caption className="sr-only">Announcements, newest first</caption>
            <thead>
              <tr className="border-b border-outline-variant text-left">
                {["Announcement", "State", "Audience", "Window", "Dismissed by", ""].map((h, i) => (
                  <th key={i} scope="col" className="px-4 py-2 text-label font-medium text-on-surface-variant whitespace-nowrap">
                    {h || <span className="sr-only">Actions</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/40">
              {announcements.map((a: any) => {
                const state = stateOf(a);
                return (
                  <tr key={a.id}>
                    <td className="px-4 py-3 max-w-sm">
                      <p className="text-on-surface font-medium">{a.title}</p>
                      <p className="text-label text-on-surface-variant line-clamp-2">{a.body}</p>
                      <p className="text-label text-on-surface-variant mt-0.5">{a.severity}{a.dismissible ? "" : " · not dismissible"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-label px-2 py-0.5 rounded-full font-medium", state.className)}>{state.label}</span>
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">
                      {a.targetType === "ALL" ? "Everyone" : a.targetType === "PLAN" ? `Plan: ${a.targetPlanSlug}` : orgName(a.targetOrgId)}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">
                      {new Date(a.startsAt).toLocaleString()}
                      <span className="block text-label">{a.endsAt ? `until ${new Date(a.endsAt).toLocaleString()}` : "no end"}</span>
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant tabular-nums">{a.dismissals} users</td>
                    <td className="px-4 py-3 text-right">
                      {!a.archivedAt && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => doArchive(a)} disabled={archive.isPending}>
                          Archive
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
