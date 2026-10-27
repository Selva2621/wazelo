"use client";

import { useId, useState } from "react";
import { Check, Copy, ShieldCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import {
  useSAAdmins,
  useSACreateAdmin,
  useSASetAdminDisabled,
  useSAResetAdminTwoFactor,
} from "@/hooks/use-super-admin";
import type { SuperAdminMember } from "@/lib/api/super-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { PageHeader } from "@/components/layout/page-header";
import { TABLE_CARD } from "@/components/super-admin/list-styles";

function errorMessage(err: unknown, fallback: string): string {
  const message = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  if (Array.isArray(message)) return message[0];
  return message ?? fallback;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const labelClass = "block text-body-lg font-medium text-on-surface-variant mb-1";

interface CreatedAdmin {
  name: string;
  email: string;
  temporaryPassword: string;
}

function AdminBadges({ admin }: { admin: SuperAdminMember }) {
  return (
    <div className="flex flex-wrap gap-1">
      {admin.isYou && <Badge variant="primary">You</Badge>}
      {admin.disabledAt && <Badge variant="error">Disabled</Badge>}
      {admin.locked && <Badge variant="warning">Locked</Badge>}
      {admin.mustChangePassword && <Badge variant="info">Must set password</Badge>}
      {admin.totpEnabled ? <Badge variant="success">2FA on</Badge> : <Badge variant="muted">2FA not set up</Badge>}
    </div>
  );
}

function AddAdminForm({
  titleId,
  onCreated,
  onCancel,
}: {
  titleId: string;
  onCreated: (created: CreatedAdmin) => void;
  onCancel: () => void;
}) {
  const create = useSACreateAdmin();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const valid = name.trim().length > 0 && EMAIL.test(email.trim());

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setError(null);
    const body = { name: name.trim(), email: email.trim() };
    create.mutate(body, {
      onSuccess: ({ admin, temporaryPassword }) =>
        onCreated({ name: admin.name, email: admin.email, temporaryPassword }),
      onError: (err) => setError(errorMessage(err, "Could not add the admin")),
    });
  };

  return (
    <form onSubmit={submit} className="p-6 space-y-4" noValidate>
      <div>
        <h2 id={titleId} className="text-title-sm font-semibold text-on-surface">Add admin</h2>
        <p className="text-body text-on-surface-variant mt-1">
          They get full access to every organization. You&apos;ll get a temporary password to share with them.
        </p>
      </div>
      {error && <Alert variant="error">{error}</Alert>}
      <div>
        <label htmlFor="add-admin-name" className={labelClass}>Name</label>
        <Input
          id="add-admin-name"
          autoComplete="off"
          autoFocus
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="add-admin-email" className={labelClass}>Email</label>
        <Input
          id="add-admin-email"
          type="email"
          autoComplete="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={create.isPending}>
          Cancel
        </Button>
        <Button type="submit" loading={create.isPending} disabled={!valid}>
          Add admin
        </Button>
      </div>
    </form>
  );
}

function TemporaryPasswordReveal({
  titleId,
  created,
  onDone,
}: {
  titleId: string;
  created: CreatedAdmin;
  onDone: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(created.temporaryPassword);
      setCopied(true);
    } catch {
      toast.error("Could not copy. Select the password and copy it by hand.");
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div>
        <h2 id={titleId} className="text-title-sm font-semibold text-on-surface">{created.name} was added</h2>
        <p className="text-body text-on-surface-variant mt-1">Temporary password for {created.email}</p>
      </div>
      <div className="flex items-center gap-2">
        <code className="flex-1 min-w-0 break-all rounded-lg bg-surface-container px-3 py-2 font-mono text-body-lg text-on-surface select-all">
          {created.temporaryPassword}
        </code>
        <Button type="button" variant="secondary" onClick={copy}>
          {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <Alert variant="warning">
        Shown once — share it securely. They&apos;ll set their own password and 2FA at first sign-in.
      </Alert>
      <div className="flex justify-end">
        <Button type="button" onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  );
}

export default function SuperAdminTeamPage() {
  const titleId = useId();
  const { data: admins, isLoading, isError, refetch } = useSAAdmins();
  const setDisabled = useSASetAdminDisabled();
  const resetTwoFactor = useSAResetAdminTwoFactor();

  const [addOpen, setAddOpen] = useState(false);
  const [created, setCreated] = useState<CreatedAdmin | null>(null);
  const [disableTarget, setDisableTarget] = useState<SuperAdminMember | null>(null);
  const [resetTarget, setResetTarget] = useState<SuperAdminMember | null>(null);

  const closeAdd = () => {
    setAddOpen(false);
    setCreated(null);
  };

  const changeDisabled = (admin: SuperAdminMember, disabled: boolean) => {
    setDisabled.mutate(
      { id: admin.id, disabled },
      {
        onSuccess: () => {
          setDisableTarget(null);
          toast.success(disabled ? `${admin.name} is disabled and signed out.` : `${admin.name} can sign in again.`);
        },
        onError: (err) => {
          setDisableTarget(null);
          toast.error(errorMessage(err, disabled ? "Could not disable the admin" : "Could not enable the admin"));
        },
      },
    );
  };

  const doResetTwoFactor = () => {
    if (!resetTarget) return;
    const admin = resetTarget;
    resetTwoFactor.mutate(admin.id, {
      onSuccess: () => {
        setResetTarget(null);
        toast.success(`Two-factor reset for ${admin.name}. They'll set it up again at their next sign-in.`);
      },
      onError: (err) => {
        setResetTarget(null);
        toast.error(errorMessage(err, "Could not reset two-factor"));
      },
    });
  };

  const rowBusy = (id: string) =>
    (setDisabled.isPending && setDisabled.variables?.id === id) ||
    (resetTwoFactor.isPending && resetTwoFactor.variables === id);

  const columns: DataTableColumn<SuperAdminMember>[] = [
    {
      id: "admin",
      header: "Admin",
      cell: (a) => (
        <>
          <p className="text-on-surface font-medium">{a.name}</p>
          <p className="text-label text-on-surface-variant break-all">{a.email}</p>
        </>
      ),
    },
    { id: "status", header: "Status", skeleton: "badge", cell: (a) => <AdminBadges admin={a} /> },
    {
      id: "lastSignIn",
      header: "Last sign-in",
      cellClassName: "text-on-surface-variant whitespace-nowrap",
      cell: (a) => (a.lastLoginAt ? new Date(a.lastLoginAt).toLocaleString() : "Never"),
    },
    {
      id: "created",
      header: "Created",
      cellClassName: "text-on-surface-variant whitespace-nowrap",
      cell: (a) => new Date(a.createdAt).toLocaleDateString(),
    },
    {
      id: "actions",
      header: "Actions",
      hideHeader: true,
      skeleton: "none",
      cell: (a) =>
        !a.isYou && (
          <div className="flex justify-end gap-1 whitespace-nowrap">
            {a.totpEnabled && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={rowBusy(a.id)}
                onClick={() => setResetTarget(a)}
              >
                Reset 2FA
              </Button>
            )}
            {a.disabledAt ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={setDisabled.isPending && setDisabled.variables?.id === a.id}
                disabled={rowBusy(a.id)}
                onClick={() => changeDisabled(a, false)}
              >
                Enable
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={rowBusy(a.id)}
                onClick={() => setDisableTarget(a)}
              >
                Disable
              </Button>
            )}
          </div>
        ),
    },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-5xl">
      <PageHeader
        title="Team"
        count={admins?.length}
        description="Super admins of this portal"
        actions={
          <Button onClick={() => setAddOpen(true)}>
            <UserPlus className="h-4 w-4" aria-hidden /> Add admin
          </Button>
        }
      />

      <section className={TABLE_CARD} aria-label="Super admins">
        <DataTable
          label="Super admins"
          columns={columns}
          rows={admins ?? []}
          rowKey={(a) => a.id}
          rowLabel={(a) => a.name}
          loading={isLoading}
          skeletonRows={4}
          error={isError}
          onRetry={() => refetch()}
          empty={{
            icon: <ShieldCheck className="h-12 w-12" />,
            title: "No super admins yet",
            compact: true,
          }}
        />
      </section>

      <Modal
        open={addOpen}
        onClose={closeAdd}
        // The temporary password is shown once: only "Done" closes the reveal
        dismissible={!created}
        aria-labelledby={titleId}
        className="max-w-md"
      >
        {() =>
          created ? (
            <TemporaryPasswordReveal titleId={titleId} created={created} onDone={closeAdd} />
          ) : (
            <AddAdminForm titleId={titleId} onCreated={setCreated} onCancel={closeAdd} />
          )
        }
      </Modal>

      <ConfirmDialog
        open={!!disableTarget}
        title={`Disable ${disableTarget?.name ?? "this admin"}?`}
        message="They'll be signed out everywhere and can't sign in until re-enabled."
        confirmLabel="Disable"
        variant="danger"
        loading={setDisabled.isPending}
        onConfirm={() => disableTarget && changeDisabled(disableTarget, true)}
        onCancel={() => setDisableTarget(null)}
      />
      <ConfirmDialog
        open={!!resetTarget}
        title={`Reset two-factor for ${resetTarget?.name ?? "this admin"}?`}
        message="Their authenticator and recovery codes stop working and they're signed out everywhere. They'll set up two-factor again at their next sign-in."
        confirmLabel="Reset 2FA"
        variant="warning"
        loading={resetTwoFactor.isPending}
        onConfirm={doResetTwoFactor}
        onCancel={() => setResetTarget(null)}
      />
    </div>
  );
}
