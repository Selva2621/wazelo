"use client";

import { useId, useMemo, useState } from "react";
import { Download, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useSAOrgLifecycle } from "@/hooks/use-super-admin";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FALLBACK_ZONES = [
  "UTC",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "Australia/Sydney",
];
const textareaClass =
  "w-full px-3 py-2 text-body-lg rounded-lg border border-outline-variant bg-surface-container-low text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 resize-none";
const labelClass = "block text-label font-medium text-on-surface-variant mb-1";

function errorMessage(err: unknown, fallback: string): string {
  const message = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  if (Array.isArray(message)) return message[0];
  return message ?? fallback;
}

export function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString(undefined, { dateStyle: "medium" });
}

function localDateStamp(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

interface OrgIdentity {
  id: string;
  name: string;
  slug: string;
  timezone: string;
}

/* ───────────────────────── Edit details ───────────────────────── */

export function EditOrgDialog({ org, open, onClose }: { org: OrgIdentity; open: boolean; onClose: () => void }) {
  const titleId = useId();
  const { update } = useSAOrgLifecycle(org.id);
  const close = () => !update.isPending && onClose();
  return (
    <Modal open={open} onClose={close} dismissible={!update.isPending} aria-labelledby={titleId} className="max-w-md">
      {() => <EditOrgForm org={org} titleId={titleId} onDone={onClose} onCancel={close} />}
    </Modal>
  );
}

function EditOrgForm({
  org,
  titleId,
  onDone,
  onCancel,
}: {
  org: OrgIdentity;
  titleId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { update } = useSAOrgLifecycle(org.id);
  const fieldId = useId();
  const [name, setName] = useState(org.name);
  const [slug, setSlug] = useState(org.slug);
  const [timezone, setTimezone] = useState(org.timezone ?? "");
  const [error, setError] = useState<string | null>(null);

  const zones = useMemo(() => {
    try {
      return typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : FALLBACK_ZONES;
    } catch {
      return FALLBACK_ZONES;
    }
  }, []);

  const changes: { name?: string; slug?: string; timezone?: string } = {};
  if (name.trim() !== org.name) changes.name = name.trim();
  if (slug.trim() !== org.slug) changes.slug = slug.trim();
  if (timezone.trim() !== (org.timezone ?? "")) changes.timezone = timezone.trim();

  const nameError = name.trim().length === 0 ? "Name is required" : name.trim().length > 255 ? "Use 255 characters or fewer" : undefined;
  const slugError =
    slug.trim().length < 3 || slug.trim().length > 60
      ? "Use 3–60 characters"
      : !SLUG_RE.test(slug.trim())
        ? "Lowercase letters, numbers and single hyphens only"
        : undefined;
  const timezoneError = timezone.trim().length === 0 ? "Time zone is required" : undefined;
  const invalid = !!(nameError || slugError || timezoneError);
  const hasChanges = Object.keys(changes).length > 0;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (invalid || !hasChanges) return;
    setError(null);
    update
      .mutateAsync(changes)
      .then(() => {
        toast.success("Organization details saved.");
        onDone();
      })
      .catch((err) => setError(errorMessage(err, "Could not save the changes")));
  };

  return (
    <form onSubmit={submit} className="p-6 space-y-4" noValidate>
      <h2 id={titleId} className="text-title-sm font-semibold text-on-surface">Edit details</h2>

      <div>
        <label htmlFor={`${fieldId}-name`} className={labelClass}>Name</label>
        <Input
          id={`${fieldId}-name`}
          autoFocus
          maxLength={255}
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={name !== org.name ? nameError : undefined}
        />
      </div>

      <div>
        <label htmlFor={`${fieldId}-slug`} className={labelClass}>Slug</label>
        <Input
          id={`${fieldId}-slug`}
          maxLength={60}
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          error={slug !== org.slug ? slugError : undefined}
          spellCheck={false}
          autoCapitalize="off"
        />
      </div>

      <div>
        <label htmlFor={`${fieldId}-tz`} className={labelClass}>Time zone</label>
        <Input
          id={`${fieldId}-tz`}
          list={`${fieldId}-tz-list`}
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          placeholder="e.g. Asia/Kolkata"
          error={timezone !== (org.timezone ?? "") ? timezoneError : undefined}
          spellCheck={false}
          autoCapitalize="off"
        />
        <datalist id={`${fieldId}-tz-list`}>
          {zones.map((z) => (
            <option key={z} value={z} />
          ))}
        </datalist>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={update.isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={update.isPending} disabled={invalid || !hasChanges}>
          Save changes
        </Button>
      </div>
    </form>
  );
}

/* ───────────────────────── Export data ───────────────────────── */

export function ExportOrgButton({ orgId, orgSlug }: { orgId: string; orgSlug: string }) {
  const { exportData } = useSAOrgLifecycle(orgId);

  const run = () =>
    exportData
      .mutateAsync()
      .then((data) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `org-${orgSlug}-export-${localDateStamp()}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 0);
        toast.success("Export downloaded.");
        if (data.contactsTruncated) {
          toast.warning(
            `Contacts were capped at 100,000 (of ${data.contactTotal.toLocaleString()}). The rest are not in the file.`,
          );
        }
      })
      .catch((err) => toast.error(errorMessage(err, "Could not export this organization")));

  return (
    <Button variant="secondary" onClick={run} loading={exportData.isPending}>
      {!exportData.isPending && <Download className="h-4 w-4" aria-hidden />} Export data
    </Button>
  );
}

/* ───────────────────────── Delete ───────────────────────── */

export function DeleteOrgDialog({
  orgId,
  orgName,
  open,
  onClose,
}: {
  orgId: string;
  orgName: string;
  open: boolean;
  onClose: () => void;
}) {
  const titleId = useId();
  const { remove } = useSAOrgLifecycle(orgId);
  const close = () => !remove.isPending && onClose();
  return (
    <Modal open={open} onClose={close} dismissible={!remove.isPending} aria-labelledby={titleId} className="max-w-md">
      {() => <DeleteOrgForm orgId={orgId} orgName={orgName} titleId={titleId} onDone={onClose} onCancel={close} />}
    </Modal>
  );
}

function DeleteOrgForm({
  orgId,
  orgName,
  titleId,
  onDone,
  onCancel,
}: {
  orgId: string;
  orgName: string;
  titleId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { remove } = useSAOrgLifecycle(orgId);
  const fieldId = useId();
  const [reason, setReason] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const nameMatches = confirmName.trim().toLowerCase() === orgName.trim().toLowerCase();
  const reasonValid = reason.trim().length >= 3;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameMatches || !reasonValid) return;
    setError(null);
    remove
      .mutateAsync({ confirmName: confirmName.trim(), reason: reason.trim() })
      .then((result) => {
        toast.success(`Organization deleted — restorable until ${formatDate(result.restorableUntil)}`);
        onDone();
      })
      .catch((err) => setError(errorMessage(err, "Could not delete this organization")));
  };

  return (
    <form onSubmit={submit} className="p-6 space-y-4">
      <h2 id={titleId} className="text-title-sm font-semibold text-on-surface">Delete {orgName}?</h2>
      <ul className="list-disc pl-5 space-y-1 text-body text-on-surface-variant">
        <li>All users are locked out now and their sessions are ended.</li>
        <li>The current subscription is cancelled. Restoring does not bring it back.</li>
        <li>Data is kept and the organization can be restored for 30 days.</li>
      </ul>

      <div>
        <label htmlFor={`${fieldId}-reason`} className={labelClass}>
          Reason (recorded in the audit log)
        </label>
        <textarea
          id={`${fieldId}-reason`}
          autoFocus
          rows={3}
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className={textareaClass}
        />
      </div>

      <div>
        <label htmlFor={`${fieldId}-confirm`} className={labelClass}>
          Type <span className="font-semibold text-on-surface">{orgName}</span> to confirm
        </label>
        <Input
          id={`${fieldId}-confirm`}
          value={confirmName}
          onChange={(e) => setConfirmName(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={remove.isPending}>
          Cancel
        </Button>
        <Button type="submit" variant="destructive" loading={remove.isPending} disabled={!nameMatches || !reasonValid}>
          Delete organization
        </Button>
      </div>
    </form>
  );
}

/* ───────────────────────── Deleted state ───────────────────────── */

export function DeletedOrgBanner({
  orgId,
  orgName,
  deletedAt,
  restorableUntil,
}: {
  orgId: string;
  orgName: string;
  deletedAt: string;
  restorableUntil: string | null;
}) {
  const { restore } = useSAOrgLifecycle(orgId);
  const [confirming, setConfirming] = useState(false);
  // Read the clock once per mount (render must stay pure)
  const [now] = useState(() => Date.now());
  const expired = !!restorableUntil && new Date(restorableUntil).getTime() < now;

  const doRestore = () =>
    restore
      .mutateAsync()
      .then(() => {
        toast.success(`${orgName} is restored. Users can sign in again.`);
        setConfirming(false);
      })
      .catch((err) => {
        toast.error(errorMessage(err, "Could not restore this organization"));
        setConfirming(false);
      });

  return (
    <>
      <Alert variant="error">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span>
            Deleted on {formatDate(deletedAt)}.{" "}
            {restorableUntil
              ? expired
                ? `The restore window ended on ${formatDate(restorableUntil)}.`
                : `Restorable until ${formatDate(restorableUntil)}.`
              : ""}{" "}
            Users can&apos;t sign in. This page is read-only.
          </span>
          {!expired && (
            <Button size="sm" variant="secondary" onClick={() => setConfirming(true)}>
              <RotateCcw className="h-4 w-4" aria-hidden /> Restore
            </Button>
          )}
        </div>
      </Alert>
      <ConfirmDialog
        open={confirming}
        variant="warning"
        title={`Restore ${orgName}?`}
        message="Users can sign in again. The subscription stays cancelled — the organization needs a new subscription before paid features return."
        confirmLabel="Restore"
        loading={restore.isPending}
        onConfirm={doRestore}
        onCancel={() => !restore.isPending && setConfirming(false)}
      />
    </>
  );
}
